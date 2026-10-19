/**
 * Adviser Matching Controller — CoreResearch Phase 6
 *
 * Handles HTTP requests for adviser matching.
 * This is the gateway between the React frontend and the NLP service.
 *
 * Flow (Phase 6 Target Architecture):
 *   React → POST /api/adviser-matching/match → This Controller
 *     → Check MongoDB MatchCache
 *     → Fetch advisers from MongoDB User collection
 *     → Filter eligible advisers
 *     → Call AdviserMatchingService.matchAdvisers() (External Provider)
 *     → Validate & normalize results
 *     → Enforce top 5
 *     → Persist match results to MongoDB MatchCache
 *     → Return to React
 */

import mongoose from "mongoose";
import { createHash } from "crypto";
import { User } from "../models/User.js";
import { MatchCache } from "../models/MatchCache.js";
import { AdviserResearchDocument } from "../models/AdviserResearchDocument.js";
import adviserMatchingService from "../services/adviserMatchingService.js";
import {
  isDevMockMode,
  mockFirestoreDb,
  mockUsersDb,
} from "../config/firebaseAdmin.js";

/**
 * Fetch all adviser users from MongoDB.
 * Returns users with role='adviser' or 'faculty' that are active and eligible.
 */
async function getEligibleAdvisers() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database connection unavailable");
  }

  console.log("[AdviserMatching] Fetching eligible advisers from MongoDB...");

  // Directly query the authoritative MongoDB for advisers, faculty, and advising-enabled admins
  const allUsers = await User.find({
    $or: [
      { role: { $in: ["adviser", "faculty"] } },
      { role: "admin", isAvailable: true },
    ],
  }).lean();
  console.log(
    `[AdviserMatching] Successfully fetched ${allUsers.length} advisers from MongoDB.`,
  );

  // Filter to eligible advisers only
  const advisers = allUsers.filter((u) => {
    if (!["adviser", "faculty", "admin"].includes(u.role)) return false;
    if (u.status === "inactive" || u.status === "suspended") return false;
    if (u.is_approved === false) return false;
    return true;
  });

  return advisers;
}

let adviserPapersCache = {
  map: null,
  timestamp: 0,
};
const ADVISER_PAPERS_TTL = 60 * 1000;

let availableAdvisersCache = {
  data: null,
  count: 0,
  timestamp: 0,
};
const AVAILABLE_ADVISERS_TTL = 60 * 1000;

export function invalidateAdviserCache() {
  adviserPapersCache = { map: null, timestamp: 0 };
  availableAdvisersCache = { data: null, count: 0, timestamp: 0 };
}

/**
 * Load published research documents for advisers from MongoDB.
 */
async function getAdviserPapersMap() {
  if (adviserPapersCache.map && Date.now() - adviserPapersCache.timestamp < ADVISER_PAPERS_TTL) {
    return adviserPapersCache.map;
  }
  const adviserPapersMap = new Map();
  try {
    if (mongoose.connection.readyState === 1) {
      const allPapers = await AdviserResearchDocument.find({
        $or: [
          { processingStatus: "READY" },
          { title: { $exists: true, $ne: "" } },
        ],
      })
        .select(
          "id adviserId title abstract keywords researchTopics methodologies fileUrl processingStatus",
        )
        .lean();

      allPapers.forEach((paper) => {
        if (!paper.adviserId) return;
        if (!adviserPapersMap.has(paper.adviserId)) {
          adviserPapersMap.set(paper.adviserId, []);
        }
        adviserPapersMap.get(paper.adviserId).push({
          id: paper.id,
          title: paper.title,
          abstract: paper.abstract || "",
          keywords: paper.keywords || [],
          researchTopics: paper.researchTopics || [],
          methodologies: paper.methodologies || [],
          fileUrl: paper.fileUrl || "",
          status: paper.processingStatus || "READY",
        });
      });
      adviserPapersCache = {
        map: adviserPapersMap,
        timestamp: Date.now(),
      };
    }
  } catch (paperErr) {
    console.warn(
      "[AdviserMatching] Could not load adviser papers:",
      paperErr.message,
    );
  }
  return adviserPapersMap;
}

/**
 * Compute all eligible advisers with open capacity slots as alternatives.
 */
function computeAvailableAlternatives(
  advisers,
  existingResults = [],
  adviserPapersMap = new Map(),
) {
  return advisers
    .filter((adv) => {
      const cap = adv.maxCapacity ?? 5;
      const active = adv.activeGroupsCount ?? 0;
      const slots = Math.max(0, cap - active);
      return slots > 0 && (adv.isAvailable ?? true);
    })
    .map((adv) => {
      const cap = adv.maxCapacity ?? 5;
      const active = adv.activeGroupsCount ?? 0;
      const slots = Math.max(0, cap - active);
      const publishedWorks = adviserPapersMap.get(adv.uid) || [];
      const existingMatch = (existingResults || []).find(
        (r) => r.adviserId === adv.uid,
      );
      const score = existingMatch
        ? (existingMatch.compatibilityScore ?? existingMatch.score ?? 0)
        : 0;

      return {
        adviserId: adv.uid,
        adviserName: adv.fullName || "Unknown Adviser",
        department: adv.department || "N/A",
        profile_image: adv.profile_image || adv.photoURL || "",
        email: adv.email || "",
        college: adv.college || "",
        expertise: adv.expertise || adv.selectedExpertise || [],
        score,
        compatibilityScore: score,
        maxCapacity: cap,
        activeGroupsCount: active,
        availableSlots: slots,
        isFull: false,
        isAvailable: true,
        publishedWorks,
        matchedKeywords: existingMatch?.matchedKeywords || [],
        matchedPaperTitle:
          existingMatch?.matchedPaperTitle || publishedWorks[0]?.title || "",
        explanation:
          existingMatch?.explanation ||
          (publishedWorks.length > 0
            ? `Available with ${slots} open slot${slots > 1 ? "s" : ""}. Has ${publishedWorks.length} published research paper${publishedWorks.length > 1 ? "s" : ""} available to explore.`
            : `Available with ${slots} open slot${slots > 1 ? "s" : ""} this academic term.`),
      };
    })
    .sort((a, b) => b.score - a.score || b.availableSlots - a.availableSlots);
}

/**
 * POST /api/adviser-matching/match
 *
 * Receives a research title and description from an authenticated student,
 * fetches eligible advisers, runs matching through the configured provider,
 * validates results, enforces top 5, persists, and returns.
 */
export const matchAdvisers = async (req, res) => {
  let matchCacheKey;
  try {
    const user = req.user;
    const { title, description } = req.body;

    // ── Input Validation ──────────────────────────────────────────────────
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: "Bad Request",
        message:
          "Research title is required and must be at least 3 characters long.",
      });
    }

    const cleanTitle = title.trim();
    const cleanDesc = (description || "").trim();

    // ── Duplicate Submission Protection (MongoDB Cache) ───────────────────
    const inputHash = createHash("sha256")
      .update(`${cleanTitle.toLowerCase()}\n${cleanDesc}`)
      .digest("hex")
      .slice(0, 48);
    matchCacheKey = `match_${user.uid}_${inputHash}`;

    if (mongoose.connection.readyState === 1) {
      try {
        const existing = await MatchCache.findOne({ id: matchCacheKey }).lean();
        if (existing) {
          const ageMs =
            Date.now() -
            new Date(existing.updatedAt || existing.generatedAt).getTime();
          if (existing.status === "processing" && ageMs < 10 * 60 * 1000) {
            return res.status(202).json({
              success: true,
              status: "processing",
              sessionId: existing.id,
              message: "Matching is already in progress.",
            });
          }

          if (existing.status === "processing") {
            await MatchCache.updateOne(
              { id: matchCacheKey },
              {
                $set: {
                  status: "failed",
                  statusMessage: "Matching was interrupted. Please retry.",
                  updatedAt: new Date(),
                },
              },
            );
          } else if (
            (existing.status || "completed") === "completed" &&
            ageMs < 5 * 60 * 1000
          ) {
            console.log(
              `[AdviserMatching] Returning cached match for "${cleanTitle.substring(0, 40)}..." (age: ${Math.round(ageMs / 1000)}s)`,
            );

            let alternatives = existing.availableAlternatives;
            if (!alternatives || alternatives.length === 0) {
              const freshAdvisers = await getEligibleAdvisers();
              const freshPapersMap = await getAdviserPapersMap();
              alternatives = computeAvailableAlternatives(
                freshAdvisers,
                existing.results || [],
                freshPapersMap,
              );
            }

            return res.status(200).json({
              success: true,
              cached: true,
              data: existing.results || [],
              availableAlternatives: alternatives || [],
              meta: {
                provider: existing.provider,
                algorithmVersion: existing.algorithmVersion,
                generatedAt: existing.generatedAt,
                executionTimeMs: existing.executionTimeMs,
                allTopMatchesFull:
                  (existing.results?.length || 0) > 0 &&
                  existing.results.every((r) => r.isFull),
                totalAvailableAdvisers: (alternatives || []).length,
              },
            });
          }
        }

        try {
          await MatchCache.findOneAndUpdate(
            { id: matchCacheKey, status: { $ne: "processing" } },
            {
              $set: {
                studentId: user.uid,
                studentName: user.fullName || user.email,
                title: cleanTitle,
                description: cleanDesc,
                status: "processing",
                statusMessage: "",
                generatedAt: new Date(),
                updatedAt: new Date(),
              },
              $setOnInsert: {
                id: matchCacheKey,
                results: [],
                availableAlternatives: [],
              },
            },
            { upsert: true, new: true },
          );
        } catch (claimError) {
          if (claimError.code !== 11000) throw claimError;
          return res.status(202).json({
            success: true,
            status: "processing",
            sessionId: matchCacheKey,
            message: "Matching is already in progress.",
          });
        }
      } catch (cacheErr) {
        console.warn(
          "[AdviserMatching] Cache check warning:",
          cacheErr.message,
        );
        if (cacheErr.code !== 11000) throw cacheErr;
        return res.status(202).json({
          success: true,
          status: "processing",
          sessionId: matchCacheKey,
        });
      }
    } else {
      return res.status(503).json({
        success: false,
        error: "Service Unavailable",
        message: "Database is temporarily unavailable.",
      });
    }

    // ── Fetch Eligible Advisers ───────────────────────────────────────────
    let advisers;
    try {
      advisers = await getEligibleAdvisers();
    } catch (dbErr) {
      console.error("[AdviserMatching] Failed to fetch advisers:", dbErr);
      await MatchCache.updateOne(
        { id: matchCacheKey, studentId: user.uid },
        {
          $set: {
            status: "failed",
            statusMessage: "Adviser data could not be loaded. Please retry.",
            updatedAt: new Date(),
          },
        },
      ).catch((persistError) =>
        console.warn(
          "[AdviserMatching] Failed to persist adviser lookup error:",
          persistError.message,
        ),
      );
      return res.status(503).json({
        success: false,
        error: "Database Unavailable",
        message:
          "Unable to load adviser data. The adviser matching service could not retrieve the current adviser profiles.",
      });
    }

    if (advisers.length === 0) {
      await MatchCache.updateOne(
        { id: matchCacheKey, studentId: user.uid },
        {
          $set: {
            status: "completed",
            statusMessage: "",
            results: [],
            availableAlternatives: [],
            provider: adviserMatchingService.getProviderName(),
            algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      );
      return res.status(200).json({
        success: true,
        data: [],
        meta: {
          provider: adviserMatchingService.getProviderName(),
          message: "No eligible advisers found in the system.",
        },
      });
    }

    // ── Prepare adviser data for matching (only matching-relevant fields) ─
    const normalizeField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) {
        return [
          ...new Set(
            field
              .filter((e) => typeof e === "string" && e.trim())
              .map((e) => e.trim()),
          ),
        ];
      }
      if (typeof field === "string") {
        return [
          ...new Set(
            field
              .split(",")
              .map((e) => e.trim())
              .filter((e) => e.length > 0),
          ),
        ];
      }
      return [];
    };

    const adviserProfiles = advisers.map((adv) => {
      const specialization = normalizeField(adv.specialization);
      let expertise = normalizeField(adv.expertise);
      const researchInterests = normalizeField(adv.researchInterests);
      const keywords = normalizeField(adv.keywords);

      if (expertise.length === 0) {
        expertise = normalizeField(adv.selectedExpertise);
      }

      const selected = normalizeField(adv.selectedExpertise);
      const hasLegacyData =
        specialization.length > 0 ||
        researchInterests.length > 0 ||
        keywords.length > 0;

      return {
        adviserId: adv.uid,
        specialization:
          specialization.length > 0
            ? specialization
            : hasLegacyData
              ? []
              : selected,
        expertise,
        researchInterests,
        keywords: keywords.length > 0 ? keywords : selected,
      };
    });

    // ── Run Matching ──────────────────────────────────────────────────────
    const startTime = Date.now();
    let matchResults;

    try {
      matchResults = await adviserMatchingService.matchAdvisers(
        cleanTitle,
        cleanDesc,
        adviserProfiles,
      );
    } catch (matchError) {
      console.error(
        "[AdviserMatching] Matching service error:",
        matchError.message,
      );
      await MatchCache.updateOne(
        { id: matchCacheKey, studentId: user.uid },
        {
          $set: {
            status: "failed",
            statusMessage:
              matchError.message || "Matching failed. Please retry.",
            updatedAt: new Date(),
          },
        },
      ).catch((persistError) =>
        console.warn(
          "[AdviserMatching] Failed to persist matching error:",
          persistError.message,
        ),
      );
      const statusCode =
        matchError.message.includes("unavailable") ||
        matchError.message.includes("timed out")
          ? 503
          : 500;
      return res.status(statusCode).json({
        success: false,
        error: statusCode === 503 ? "Service Unavailable" : "Matching Error",
        message:
          matchError.message.includes("unavailable") ||
          matchError.message.includes("timed out")
            ? "Adviser matching service is temporarily unavailable. Please try again later."
            : "An error occurred during adviser matching. Please try again.",
      });
    }

    const executionTimeMs = Date.now() - startTime;

    // ── Load Published Research Documents for Advisers ──────────────────
    const adviserPapersMap = await getAdviserPapersMap();

    // ── Validate & Enrich Results ─────────────────────────────────────────
    const adviserMap = new Map(advisers.map((a) => [a.uid, a]));

    const enrichedResults = matchResults
      .filter((r) => {
        const adv = adviserMap.get(r.adviserId);
        if (!adv) {
          console.warn(
            `[AdviserMatching] Removing unknown adviser: ${r.adviserId}`,
          );
          return false;
        }
        return true;
      })
      .map((r) => {
        const adv = adviserMap.get(r.adviserId);
        const maxCapacity = adv.maxCapacity ?? 5;
        const activeGroupsCount = adv.activeGroupsCount ?? 0;
        const availableSlots = Math.max(0, maxCapacity - activeGroupsCount);
        const isFull = availableSlots <= 0;
        const publishedWorks = adviserPapersMap.get(adv.uid) || [];

        return {
          ...r,
          adviserName: adv.fullName || "Unknown Adviser",
          department: adv.department || "N/A",
          profile_image: adv.profile_image || adv.photoURL || "",
          email: adv.email || "",
          college: adv.college || "",
          expertise: adv.expertise || adv.selectedExpertise || [],
          score: Math.round(Math.min(Math.max(r.score || 0, 0), 100)),
          compatibilityScore: Math.round(
            Math.min(Math.max(r.score || 0, 0), 100),
          ),
          maxCapacity,
          activeGroupsCount,
          availableSlots,
          isFull,
          isAvailable: (adv.isAvailable ?? true) && !isFull,
          publishedWorks,
        };
      });

    enrichedResults.sort((a, b) => b.score - a.score);
    const top5 = enrichedResults.slice(0, 5);

    // ── Compute Available Faculty Alternatives with Open Slots ───────────
    const availableAlternatives = computeAvailableAlternatives(
      advisers,
      enrichedResults,
      adviserPapersMap,
    );

    // ── Persist Match Results (MongoDB) ───────────────────────────────────
    try {
      if (mongoose.connection.readyState === 1) {
        await MatchCache.findOneAndUpdate(
          { id: matchCacheKey },
          {
            $set: {
              studentId: user.uid,
              studentName: user.fullName || user.email,
              title: cleanTitle,
              description: cleanDesc,
              results: top5,
              availableAlternatives,
              provider: adviserMatchingService.getProviderName(),
              algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
              executionTimeMs,
              generatedAt: new Date(),
              updatedAt: new Date(),
              status: "completed",
              statusMessage: "",
            },
          },
          { upsert: true },
        );
      }
    } catch (persistErr) {
      console.warn(
        "[AdviserMatching] Failed to persist match results:",
        persistErr.message,
      );
    }

    console.log(
      `[AdviserMatching] Match complete\n` +
        `  Research ID: ${matchCacheKey}\n` +
        `  Provider: ${adviserMatchingService.getProviderName()}\n` +
        `  Advisers evaluated: ${advisers.length}\n` +
        `  Top score: ${top5[0]?.score || 0}\n` +
        `  Available alternatives: ${availableAlternatives.length}\n` +
        `  Execution time: ${executionTimeMs}ms\n` +
        `  Algorithm: ${adviserMatchingService.getAlgorithmVersion()}`,
    );

    return res.status(200).json({
      success: true,
      cached: false,
      data: top5,
      availableAlternatives,
      meta: {
        provider: adviserMatchingService.getProviderName(),
        algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
        advisersEvaluated: advisers.length,
        executionTimeMs,
        generatedAt: new Date().toISOString(),
        allTopMatchesFull: top5.length > 0 && top5.every((t) => t.isFull),
        totalAvailableAdvisers: availableAlternatives.length,
      },
    });
  } catch (error) {
    console.error("[AdviserMatching] Controller error:", error);
    if (matchCacheKey && req.user?.uid) {
      await MatchCache.updateOne(
        { id: matchCacheKey, studentId: req.user.uid },
        {
          $set: {
            status: "failed",
            statusMessage:
              "An unexpected error occurred during adviser matching.",
            updatedAt: new Date(),
          },
        },
      ).catch(() => {});
    }
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "An unexpected error occurred during adviser matching.",
    });
  }
};

/** GET /api/adviser-matching/session — return the signed-in student's latest durable session. */
export const getLatestMatchingSession = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: "Matching session storage is temporarily unavailable.",
      });
    }
    const session = await MatchCache.findOne({ studentId: req.user.uid })
      .sort({ generatedAt: -1 })
      .lean();
    if (!session) return res.status(200).json({ success: true, data: null });

    const sessionAgeMs =
      Date.now() - new Date(session.updatedAt || session.generatedAt).getTime();
    if (session.status === "processing" && sessionAgeMs >= 10 * 60 * 1000) {
      session.status = "failed";
      session.statusMessage = "Matching was interrupted. Please retry.";
      session.updatedAt = new Date();
      await MatchCache.updateOne(
        { id: session.id, studentId: req.user.uid, status: "processing" },
        {
          $set: {
            status: session.status,
            statusMessage: session.statusMessage,
            updatedAt: session.updatedAt,
          },
        },
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        id: session.id,
        status: session.status || "completed",
        statusMessage: session.statusMessage || "",
        title: session.title,
        description: session.description || "",
        matches: session.results || [],
        availableAlternatives: session.availableAlternatives || [],
        allTopMatchesFull:
          (session.results || []).length > 0 &&
          session.results.every((result) => result.isFull),
        meta: {
          provider: session.provider,
          algorithmVersion: session.algorithmVersion,
          executionTimeMs: session.executionTimeMs,
          generatedAt: session.generatedAt,
          totalAvailableAdvisers: (session.availableAlternatives || []).length,
        },
      },
    });
  } catch (error) {
    console.error("[AdviserMatching] Session restore failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to restore the matching session.",
    });
  }
};

import { documentAnalysisService } from "../services/DocumentAnalysisService.js";

/**
 * POST /api/adviser-matching/extract-document
 *
 * Receives a student's research document upload, dynamically parses it,
 * extracts text, and uses NLP to determine the Title, Abstract, etc.
 *
 * Does NOT store the document permanently. Used strictly for auto-filling
 * the student research title submission form.
 */
export const extractDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No document uploaded." });
    }

    const { buffer, mimetype, size, originalname } = req.file;

    if (size > 12 * 1024 * 1024) {
      return res
        .status(400)
        .json({ success: false, message: "File size exceeds the 10MB limit." });
    }

    console.log(
      `[AdviserMatching] Extracting document: ${originalname} (${mimetype})`,
    );

    // 1. Extract text
    const extractedText = await documentAnalysisService.extractText(
      buffer,
      mimetype,
      originalname,
    );
    const textToProcess = extractedText.substring(0, 30000);

    // 2. Run NLP Analysis
    const nlpData =
      await documentAnalysisService.analyzeDocument(textToProcess);

    // If title wasn't found by AI, fallback to filename without extension
    if (!nlpData.title) {
      nlpData.title = originalname.replace(/\.[^/.]+$/, "");
    }

    return res.status(200).json({
      success: true,
      data: {
        title: nlpData.title,
        abstract: nlpData.abstract,
        keywords: nlpData.keywords,
        researchTopics: nlpData.researchTopics,
        researchDomain: nlpData.researchDomain,
      },
    });
  } catch (error) {
    console.error("[AdviserMatching] Document extraction error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to extract document content.",
    });
  }
};

/**
 * GET /api/adviser-matching/available
 *
 * Returns all active advisers who currently have available slots,
 * along with their verified published research documents and abstracts.
 */
export const getAvailableAdvisers = async (req, res) => {
  try {
    if (
      availableAdvisersCache.data &&
      Date.now() - availableAdvisersCache.timestamp < AVAILABLE_ADVISERS_TTL
    ) {
      return res.status(200).json({
        success: true,
        data: availableAdvisersCache.data,
        count: availableAdvisersCache.count,
        cached: true,
      });
    }

    const advisers = await getEligibleAdvisers();
    const adviserPapersMap = await getAdviserPapersMap();

    const available = advisers
      .filter((adv) => {
        const cap = adv.maxCapacity ?? 5;
        const active = adv.activeGroupsCount ?? 0;
        return cap - active > 0 && (adv.isAvailable ?? true);
      })
      .map((adv) => {
        const cap = adv.maxCapacity ?? 5;
        const active = adv.activeGroupsCount ?? 0;
        const slots = Math.max(0, cap - active);
        const publishedWorks = adviserPapersMap.get(adv.uid) || [];

        return {
          adviserId: adv.uid,
          adviserName: adv.fullName || "Unknown Adviser",
          department: adv.department || "N/A",
          profile_image: adv.profile_image || adv.photoURL || "",
          email: adv.email || "",
          college: adv.college || "",
          expertise: adv.expertise || adv.selectedExpertise || [],
          score: 0,
          compatibilityScore: 0,
          maxCapacity: cap,
          activeGroupsCount: active,
          availableSlots: slots,
          isFull: false,
          isAvailable: true,
          publishedWorks,
          explanation:
            publishedWorks.length > 0
              ? `Available with ${slots} open slot${slots > 1 ? "s" : ""}. Author of ${publishedWorks.length} published research paper${publishedWorks.length > 1 ? "s" : ""}.`
              : `Available with ${slots} open slot${slots > 1 ? "s" : ""} this semester.`,
        };
      })
      .sort((a, b) => b.availableSlots - a.availableSlots);

    availableAdvisersCache = {
      data: available,
      count: available.length,
      timestamp: Date.now(),
    };

    return res.status(200).json({
      success: true,
      data: available,
      count: available.length,
    });
  } catch (error) {
    console.error("[AdviserMatching] getAvailableAdvisers error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      message: "Failed to retrieve available advisers.",
    });
  }
};
