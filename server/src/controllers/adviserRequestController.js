import { createHash } from "crypto";
import mongoose from "mongoose";
import { db } from "../config/firebaseAdmin.js";
import { User } from "../models/User.js";

const COLLECTION = "adviser_requests";

/** Read requests owned by the student or belonging to their verified group. */
export const getAdviserRequests = async (req, res) => {
  if (!db) {
    return res.status(503).json({
      success: false,
      message: "Request storage is temporarily unavailable.",
    });
  }

  const studentId = req.user?.uid;
  const groupId =
    typeof req.query.groupId === "string" ? req.query.groupId : "";
  try {
    const snapshots = [
      await db.collection(COLLECTION).where("studentId", "==", studentId).get(),
    ];
    if (groupId) {
      const groupSnapshot = await db
        .collection("research_groups")
        .doc(groupId)
        .get();
      if (!groupSnapshot.exists) {
        return res
          .status(404)
          .json({ success: false, message: "Research group not found." });
      }
      const group = groupSnapshot.data();
      const isMember =
        (group.memberIds || []).includes(studentId) ||
        (group.members || []).some((member) => member.uid === studentId) ||
        group.leaderId === studentId;
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this research group.",
        });
      }
      snapshots.push(
        await db.collection(COLLECTION).where("groupId", "==", groupId).get(),
      );
      if (snapshots[1].empty) {
        const leaderId = group.memberIds?.[0] || group.members?.[0]?.uid;
        if (leaderId)
          snapshots.push(
            await db
              .collection(COLLECTION)
              .where("studentId", "==", leaderId)
              .get(),
          );
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
    return res
      .status(200)
      .json({ success: true, data: [...requests.values()] });
  } catch (error) {
    console.error("[AdviserRequest] Read failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Unable to load adviser requests." });
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

      const groupQuery = groupId
        ? db.collection(COLLECTION).where("groupId", "==", groupId)
        : null;
      const groupMemberIds = groupSnapshot
        ? [
            ...new Set(
              [
                studentId,
                ...(groupSnapshot.data().memberIds || []),
                ...(groupSnapshot.data().members || []).map(
                  (member) => member.uid,
                ),
              ].filter(Boolean),
            ),
          ]
        : [studentId];
      const queryReads = [
        ...(groupQuery ? [transaction.get(groupQuery)] : []),
        ...groupMemberIds.map((memberId) =>
          transaction.get(
            db.collection(COLLECTION).where("studentId", "==", memberId),
          ),
        ),
      ];
      const snapshots = await Promise.all(queryReads);
      const requestDocs = new Map();
      snapshots.forEach((snapshot) => {
        snapshot?.docs.forEach((requestDoc) =>
          requestDocs.set(requestDoc.id, requestDoc),
        );
      });
      const activeDoc = [...requestDocs.values()].find((requestDoc) => {
        const request = requestDoc.data();
        return request.status === "pending" || request.status === "accepted";
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

      if (mongoose.connection.readyState !== 1) {
        const error = new Error(
          "Adviser availability could not be verified. Please retry.",
        );
        error.status = 503;
        throw error;
      }
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
        const error = new Error(
          "The selected adviser is not eligible to receive requests.",
        );
        error.status = 400;
        throw error;
      }
      const adviserCapacity = adviser.maxCapacity ?? 5;
      if (
        adviser.isAvailable === false ||
        (adviser.activeGroupsCount ?? 0) >= adviserCapacity
      ) {
        const error = new Error(
          "The selected adviser no longer has an open advising slot. Refresh the matching results and choose another adviser.",
        );
        error.status = 409;
        throw error;
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

    return res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      data: result.request,
    });
  } catch (error) {
    console.error("[AdviserRequest] Create failed:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : "Unable to submit the adviser request.",
    });
  }
};
