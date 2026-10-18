import { createHash } from "crypto";
import mongoose from "mongoose";
import { db } from "../config/firebaseAdmin.js";
import { User } from "../models/User.js";

const COLLECTION = "adviser_requests";

// Short-term in-memory cache to prevent burning Firestore read quota on repeated fetches
const requestsCache = new Map();
const CACHE_TTL_MS = 20000; // 20 seconds

function getCachedRequests(key) {
  const item = requestsCache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCachedRequests(key, data) {
  requestsCache.set(key, { data, timestamp: Date.now() });
}

export function invalidateRequestsCache(groupId, studentId) {
  if (groupId) requestsCache.delete(`group:${groupId}`);
  if (studentId) requestsCache.delete(`student:${studentId}`);
}

/** Read requests owned by the student or belonging to their verified group. */
export const getAdviserRequests = async (req, res) => {
  if (!db) {
    return res.status(503).json({
      success: false,
      code: "STORAGE_UNAVAILABLE",
      message: "Request storage is temporarily unavailable.",
    });
  }

  const studentId = req.user?.uid;
  const groupId =
    typeof req.query.groupId === "string" ? req.query.groupId : "";
  const cacheKey = groupId ? `group:${groupId}` : `student:${studentId}`;

  // 1. Return fresh in-memory cache if available to prevent Firestore quota exhaustion
  const cached = getCachedRequests(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, data: cached });
  }

  try {
    const snapshots = [
      await db.collection(COLLECTION).where("studentId", "==", studentId).get(),
    ];
    if (groupId) {
      const groupSnapshot = await db
        .collection("research_groups")
        .doc(groupId)
        .get();
      if (groupSnapshot.exists) {
        const group = groupSnapshot.data();
        const isMember =
          (group.memberIds || []).includes(studentId) ||
          (group.members || []).some((member) => member.uid === studentId) ||
          group.leaderId === studentId;
        if (!isMember) {
          return res.status(403).json({
            success: false,
            code: "FORBIDDEN",
            message: "You are not a member of this research group.",
          });
        }
        const groupRequestsSnap = await db.collection(COLLECTION).where("groupId", "==", groupId).get();
        snapshots.push(groupRequestsSnap);
        if (groupRequestsSnap.empty) {
          const leaderId = group.memberIds?.[0] || group.members?.[0]?.uid;
          if (leaderId && leaderId !== studentId) {
            snapshots.push(
              await db
                .collection(COLLECTION)
                .where("studentId", "==", leaderId)
                .get(),
            );
          }
        }
      }
    }

    const requests = new Map();
    snapshots.forEach((snapshot) =>
      snapshot.docs.forEach((requestDoc) => {
        requests.set(requestDoc.id, {
          id: requestDoc.id,
          ...requestDoc.data(),
        });
      }),
    );
    const data = [...requests.values()];
    setCachedRequests(cacheKey, data);
    return res
      .status(200)
      .json({ success: true, data });
  } catch (error) {
    const isQuotaExceeded =
      error.code === 8 ||
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      error.details?.includes("Quota exceeded");

    console.error(
      `[AdviserRequest] Read failed (${isQuotaExceeded ? "QUOTA_EXHAUSTED" : "INTERNAL_ERROR"}):`,
      error.message || error,
    );

    // If quota is exhausted but we have stale cache in memory, serve it gracefully
    const stale = requestsCache.get(cacheKey);
    if (stale?.data) {
      console.warn(`[AdviserRequest] Serving stale cached requests for ${cacheKey}`);
      return res.status(200).json({ success: true, data: stale.data, stale: true });
    }

    const statusCode = isQuotaExceeded ? 503 : 500;
    const errorCode = isQuotaExceeded ? "STORAGE_QUOTA_EXCEEDED" : "INTERNAL_ERROR";
    const errorMessage = isQuotaExceeded
      ? "Database read quota exceeded. Please wait a moment and try again."
      : "Unable to load adviser requests.";

    return res
      .status(statusCode)
      .json({ success: false, code: errorCode, message: errorMessage });
  }
};

/**
 * Create or reuse the student's active adviser request.
 * The per-group transaction lock serializes concurrent submissions, while the
 * transactional reads preserve the existing pending/accepted request.
 */
export const createAdviserRequest = async (req, res) => {
  if (!db) {
    return res.status(503).json({
      success: false,
      message: "Request storage is temporarily unavailable.",
    });
  }

  const input = req.body || {};
  const studentId = req.user?.uid;
  if (!studentId || input.studentId !== studentId) {
    return res.status(403).json({
      success: false,
      message: "You can only submit an adviser request for your own account.",
    });
  }
  if (!input.researchTitle?.trim() || !input.adviserId) {
    return res.status(400).json({
      success: false,
      message: "A research title and adviser are required.",
    });
  }

  // 1. Pre-validate adviser eligibility in MongoDB before entering Firestore transaction
  if (mongoose.connection.readyState === 1) {
    const adviser = await User.findOne({
      uid: input.adviserId,
      role: { $in: ["adviser", "faculty", "admin"] },
    }).lean();
    if (
      !adviser ||
      adviser.status === "inactive" ||
      adviser.status === "suspended" ||
      adviser.is_approved === false
    ) {
      return res.status(400).json({
        success: false,
        message: "The selected adviser is not eligible to receive requests.",
      });
    }
    const adviserCapacity = adviser.maxCapacity ?? 5;
    if (
      adviser.isAvailable === false ||
      (adviser.activeGroupsCount ?? 0) >= adviserCapacity
    ) {
      return res.status(409).json({
        success: false,
        message:
          "The selected adviser no longer has an open advising slot. Refresh the matching results and choose another adviser.",
      });
    }
  }

  const groupId = input.groupId || "";
  const scope = groupId ? `group:${groupId}` : `student:${studentId}`;
  const lockId = createHash("sha256").update(scope).digest("hex");
  const lockRef = db.collection("adviser_request_creation_locks").doc(lockId);
  const now = new Date().toISOString();

  try {
    const result = await db.runTransaction(async (transaction) => {
      const lockSnapshot = await transaction.get(lockRef);
      const groupRef = groupId
        ? db.collection("research_groups").doc(groupId)
        : null;
      const groupSnapshot = groupRef ? await transaction.get(groupRef) : null;

      if (groupSnapshot && !groupSnapshot.exists) {
        const error = new Error("Research group not found.");
        error.status = 404;
        throw error;
      }
      if (groupSnapshot) {
        const group = groupSnapshot.data();
        const isMember =
          (group.memberIds || []).includes(studentId) ||
          (group.members || []).some((member) => member.uid === studentId) ||
          group.leaderId === studentId;
        if (!isMember) {
          const error = new Error(
            "You are not a member of this research group.",
          );
          error.status = 403;
          throw error;
        }
      }

      // Fast check for active request for this group or student
      const queryReads = [];
      if (groupId) {
        queryReads.push(
          transaction.get(
            db.collection(COLLECTION).where("groupId", "==", groupId),
          ),
        );
      }
      queryReads.push(
        transaction.get(
          db.collection(COLLECTION).where("studentId", "==", studentId),
        ),
      );

      const snapshots = await Promise.all(queryReads);
      const requestDocs = new Map();
      snapshots.forEach((snapshot) => {
        snapshot?.docs.forEach((requestDoc) =>
          requestDocs.set(requestDoc.id, requestDoc),
        );
      });
      const activeDoc = [...requestDocs.values()].find((requestDoc) => {
        const request = requestDoc.data();
        return (request.status === "pending" || request.status === "accepted") && !request.isArchived;
      });

      if (activeDoc) {
        if (!lockSnapshot.exists) {
          transaction.create(lockRef, { scope, updatedAt: now });
        } else {
          transaction.update(lockRef, { updatedAt: now });
        }
        return {
          request: { id: activeDoc.id, ...activeDoc.data() },
          created: false,
        };
      }

      const requestRef = db.collection(COLLECTION).doc();
      const request = {
        id: requestRef.id,
        studentId,
        studentName:
          input.studentName || req.user.fullName || req.user.email || "",
        groupId,
        groupName: input.groupName || "",
        courseId: input.courseId || "",
        courseName: input.courseName || "",
        sectionId: input.sectionId || "",
        sectionName: input.sectionName || "",
        researchTitle: input.researchTitle.trim(),
        researchDescription: input.researchDescription || "",
        adviserId: input.adviserId,
        adviserName: input.adviserName || "",
        compatibilityScore: Number(input.compatibilityScore) || 0,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };

      transaction.create(requestRef, request);
      if (!lockSnapshot.exists) {
        transaction.create(lockRef, { scope, updatedAt: now });
      } else {
        transaction.update(lockRef, { updatedAt: now });
      }
      return { request, created: true };
    });

    invalidateRequestsCache(groupId, studentId);

    return res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      data: result.request,
    });
  } catch (error) {
    const isQuotaExceeded =
      error.code === 8 ||
      error.message?.includes("RESOURCE_EXHAUSTED") ||
      error.details?.includes("Quota exceeded");

    console.error(
      `[AdviserRequest] Create failed (${isQuotaExceeded ? "QUOTA_EXHAUSTED" : error.status ? "CLIENT_ERROR" : "INTERNAL_ERROR"}):`,
      error.message || error,
    );

    const statusCode = error.status || (isQuotaExceeded ? 503 : 500);
    const errorCode = isQuotaExceeded
      ? "STORAGE_QUOTA_EXCEEDED"
      : error.status === 403
      ? "FORBIDDEN"
      : error.status === 404
      ? "NOT_FOUND"
      : "INTERNAL_ERROR";
    const errorMessage = error.status
      ? error.message
      : isQuotaExceeded
      ? "Database storage quota exceeded. Please wait a moment and retry."
      : "Unable to submit the adviser request.";

    return res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: errorMessage,
    });
  }
};
