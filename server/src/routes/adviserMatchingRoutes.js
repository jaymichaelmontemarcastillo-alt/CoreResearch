/**
 * Adviser Matching Routes — CoreResearch Phase 6
 *
 * Routes:
 *   POST /api/adviser-matching/match   — Run adviser matching for authenticated student
 *   GET  /api/adviser-matching/health  — Check NLP service availability
 */

import express from "express";
import multer from "multer";
import {
  matchAdvisers,
  getLatestMatchingSession,
  extractDocument,
  getAvailableAdvisers,
} from "../controllers/adviserMatchingController.js";
import {
  createAdviserRequest,
  getAdviserRequests,
} from "../controllers/adviserRequestController.js";
import { verifyToken, requireRole } from "../middleware/authMiddleware.js";
import adviserMatchingService from "../services/adviserMatchingService.js";

const router = express.Router();

// Memory storage for temporary document extraction with 15MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    if (
      ext === "pdf" ||
      ext === "docx" ||
      ext === "doc" ||
      file.mimetype?.includes("pdf") ||
      file.mimetype?.includes("word")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF and DOCX files are allowed."));
    }
  },
});

// Extract metadata from an uploaded document
router.post(
  "/extract-document",
  verifyToken,
  requireRole([
    "student",
    "admin",
    "adviser",
    "faculty",
    "research_coordinator",
  ]),
  upload.single("document"),
  extractDocument,
);

// Run adviser matching — requires authenticated student
router.post("/match", verifyToken, requireRole(["student"]), matchAdvisers);
router.get(
  "/session",
  verifyToken,
  requireRole(["student"]),
  getLatestMatchingSession,
);

// Create or reuse a pending adviser request atomically for this student/group.
router.get(
  "/requests",
  verifyToken,
  requireRole(["student"]),
  getAdviserRequests,
);
router.post(
  "/requests",
  verifyToken,
  requireRole(["student"]),
  createAdviserRequest,
);

// Get all available advisers with open slots and their published research
router.get(
  "/available",
  verifyToken,
  requireRole([
    "student",
    "admin",
    "adviser",
    "faculty",
    "research_coordinator",
  ]),
  getAvailableAdvisers,
);

// NLP service health check — no auth required (for monitoring/debugging)
router.get("/health", async (req, res) => {
  try {
    const status = await adviserMatchingService.checkHealth();
    const httpStatus = status.healthy ? 200 : 503;
    return res.status(httpStatus).json({
      service: "adviser-matching",
      provider: adviserMatchingService.getProviderName(),
      ...status,
    });
  } catch (error) {
    return res.status(503).json({
      service: "adviser-matching",
      healthy: false,
      error: error.message,
    });
  }
});

export default router;
