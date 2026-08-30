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

import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { MatchCache } from '../models/MatchCache.js';
import adviserMatchingService from '../services/adviserMatchingService.js';
import { isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';

/**
 * Fetch all adviser users from MongoDB.
 * Only returns users with role='adviser' that are active and eligible.
 */
async function getEligibleAdvisers() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database connection unavailable');
  }

  console.log('[AdviserMatching] Fetching eligible advisers from MongoDB...');
  
  // Directly query the authoritative MongoDB
  const allUsers = await User.find({ role: 'adviser' }).lean();
  console.log(`[AdviserMatching] Successfully fetched ${allUsers.length} advisers from MongoDB.`);

  // Filter to eligible advisers only
  const advisers = allUsers.filter(u => {
    if (u.role !== 'adviser') return false;
    if (u.status === 'inactive' || u.status === 'suspended') return false;
    if (u.is_approved === false) return false;
    return true;
  });

  return advisers;
}

/**
 * POST /api/adviser-matching/match
 * 
 * Receives a research title and description from an authenticated student,
 * fetches eligible advisers, runs matching through the configured provider,
 * validates results, enforces top 5, persists, and returns.
 */
export const matchAdvisers = async (req, res) => {
  try {
    const user = req.user;
    const { title, description } = req.body;

    // ── Input Validation ──────────────────────────────────────────────────
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Research title is required and must be at least 3 characters long.',
      });
    }

    const cleanTitle = title.trim();
    const cleanDesc = (description || '').trim();

    // ── Duplicate Submission Protection (MongoDB Cache) ───────────────────
    const matchCacheKey = `match_${user.uid}_${cleanTitle.toLowerCase().replace(/\s+/g, '_').substring(0, 80)}`;

    if (mongoose.connection.readyState === 1) {
      try {
        const existing = await MatchCache.findOne({ id: matchCacheKey }).lean();
        if (existing) {
          const ageMs = Date.now() - new Date(existing.generatedAt).getTime();
          if (ageMs < 5 * 60 * 1000) {
            console.log(`[AdviserMatching] Returning cached match for "${cleanTitle.substring(0, 40)}..." (age: ${Math.round(ageMs / 1000)}s)`);
            return res.status(200).json({
              success: true,
              cached: true,
              data: existing.results,
              meta: {
                provider: existing.provider,
                algorithmVersion: existing.algorithmVersion,
                generatedAt: existing.generatedAt,
                executionTimeMs: existing.executionTimeMs,
              },
            });
          }
        }
      } catch (cacheErr) {
        console.warn('[AdviserMatching] Cache check warning:', cacheErr.message);
      }
    } else {
      return res.status(503).json({
        success: false,
        error: 'Service Unavailable',
        message: 'Database is temporarily unavailable.',
      });
    }

    // ── Fetch Eligible Advisers ───────────────────────────────────────────
    let advisers;
    try {
      advisers = await getEligibleAdvisers();
    } catch (dbErr) {
      console.error('[AdviserMatching] Failed to fetch advisers:', dbErr);
      return res.status(503).json({
        success: false,
        error: 'Database Unavailable',
        message: 'Unable to load adviser data. The adviser matching service could not retrieve the current adviser profiles.',
      });
    }

    if (advisers.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
        meta: {
          provider: adviserMatchingService.getProviderName(),
          message: 'No eligible advisers found in the system.',
        },
      });
    }

    // ── Prepare adviser data for matching (only matching-relevant fields) ─
    const normalizeField = (field) => {
      if (!field) return [];
      if (Array.isArray(field)) {
        return [...new Set(
          field
            .filter(e => typeof e === 'string' && e.trim())
            .map(e => e.trim())
        )];
      }
      if (typeof field === 'string') {
        return [...new Set(
          field.split(',')
            .map(e => e.trim())
            .filter(e => e.length > 0)
        )];
      }
      return [];
    };

    const adviserProfiles = advisers.map(adv => {
      const specialization = normalizeField(adv.specialization);
      let expertise = normalizeField(adv.expertise);
      const researchInterests = normalizeField(adv.researchInterests);
      const keywords = normalizeField(adv.keywords);

      if (expertise.length === 0) {
        expertise = normalizeField(adv.selectedExpertise);
      }

      const selected = normalizeField(adv.selectedExpertise);
      const hasLegacyData = specialization.length > 0 || researchInterests.length > 0 || keywords.length > 0;

      return {
        adviserId: adv.uid,
        specialization: specialization.length > 0 ? specialization : (hasLegacyData ? [] : selected),
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
        adviserProfiles
      );
    } catch (matchError) {
      console.error('[AdviserMatching] Matching service error:', matchError.message);
      const statusCode = matchError.message.includes('unavailable') || matchError.message.includes('timed out') ? 503 : 500;
      return res.status(statusCode).json({
        success: false,
        error: statusCode === 503 ? 'Service Unavailable' : 'Matching Error',
        message: matchError.message.includes('unavailable') || matchError.message.includes('timed out')
          ? 'Adviser matching service is temporarily unavailable. Please try again later.'
          : 'An error occurred during adviser matching. Please try again.',
      });
    }

    const executionTimeMs = Date.now() - startTime;

    // ── Validate & Enrich Results ─────────────────────────────────────────
    const adviserMap = new Map(advisers.map(a => [a.uid, a]));

    const enrichedResults = matchResults
      .filter(r => {
        const adv = adviserMap.get(r.adviserId);
        if (!adv) {
          console.warn(`[AdviserMatching] Removing unknown adviser: ${r.adviserId}`);
          return false;
        }
        return true;
      })
      .map(r => {
        const adv = adviserMap.get(r.adviserId);
        return {
          ...r,
          adviserName: adv.fullName || 'Unknown Adviser',
          department: adv.department || 'N/A',
          score: Math.round(Math.min(Math.max(r.score || 0, 0), 100)),
          compatibilityScore: Math.round(Math.min(Math.max(r.score || 0, 0), 100)),
        };
      });

    enrichedResults.sort((a, b) => b.score - a.score);
    const top5 = enrichedResults.slice(0, 5);

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
              provider: adviserMatchingService.getProviderName(),
              algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
              executionTimeMs,
              generatedAt: new Date()
            }
          },
          { upsert: true }
        );
      }
    } catch (persistErr) {
      console.warn('[AdviserMatching] Failed to persist match results:', persistErr.message);
    }

    console.log(
      `[AdviserMatching] Match complete\n` +
      `  Research ID: ${matchCacheKey}\n` +
      `  Provider: ${adviserMatchingService.getProviderName()}\n` +
      `  Advisers evaluated: ${advisers.length}\n` +
      `  Top score: ${top5[0]?.score || 0}\n` +
      `  Execution time: ${executionTimeMs}ms\n` +
      `  Algorithm: ${adviserMatchingService.getAlgorithmVersion()}`
    );

    return res.status(200).json({
      success: true,
      cached: false,
      data: top5,
      meta: {
        provider: adviserMatchingService.getProviderName(),
        algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
        advisersEvaluated: advisers.length,
        executionTimeMs,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[AdviserMatching] Controller error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred during adviser matching.',
    });
  }
};
