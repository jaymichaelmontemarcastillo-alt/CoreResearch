/**
 * Adviser Matching Controller — CoreResearch Phase 6
 * 
 * Handles HTTP requests for adviser matching.
 * This is the gateway between the React frontend and the NLP service.
 * 
 * Flow:
 *   React → POST /api/adviser-matching/match → This Controller
 *     → Fetch advisers from Firestore/mock
 *     → Filter eligible advisers
 *     → Call AdviserMatchingService.matchAdvisers()
 *     → Validate & normalize results
 *     → Enforce top 5
 *     → Persist match results
 *     → Return to React
 */

import { db, isDevMockMode, mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';
import adviserMatchingService from '../services/adviserMatchingService.js';

/**
 * Fetch all adviser users from Firestore or mock DB.
 * Only returns users with role='adviser' that are active and eligible.
 */
async function getEligibleAdvisers() {
  if (!db) {
    throw new Error('Database connection unavailable');
  }

  console.log('[AdviserMatching] Fetching eligible advisers from Firestore...');
  const snapshot = await db.collection('users').where('role', '==', 'adviser').get();
  console.log(`[AdviserMatching] Successfully fetched ${snapshot.docs.length} advisers from Firestore.`);
  const allUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

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

    // ── Duplicate Submission Protection ────────────────────────────────────
    // Check if a match was already generated for the same title recently
    const matchCacheKey = `match_${user.uid}_${cleanTitle.toLowerCase().replace(/\s+/g, '_').substring(0, 80)}`;

    if (db) {
      try {
        const cacheDoc = await db.collection('adviser_matches').doc(matchCacheKey).get();
        if (cacheDoc.exists) {
          const existing = cacheDoc.data();
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
        // Cache miss is fine, proceed with matching
        console.warn('[AdviserMatching] Cache check warning:', cacheErr.message);
      }
    }

    // ── Fetch Eligible Advisers ───────────────────────────────────────────
    let advisers;
    try {
      advisers = await getEligibleAdvisers();
    } catch (dbErr) {
      console.error('[AdviserMatching] Failed to fetch advisers:', dbErr);
      return res.status(500).json({
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
    // ── Normalization Layer: Support both legacy text and new selection-based expertise ──
    //
    // Each field is normalized INDEPENDENTLY so the Python NLP engine can
    // compute separate sub-scores (specialization 25%, expertise 15%,
    // researchInterests 10%) using its weighted scoring model.
    //
    // Supported formats per field:
    //   - Array of strings:  ["Web Dev", "AI"]           (new format)
    //   - Comma-separated:   "Web Dev, AI"               (legacy format)
    //   - null / undefined / empty                       (missing data — safe)
    //
    // The new `selectedExpertise` field from ProfileSettings is used as a
    // fallback for `expertise` when the legacy expertise field is empty.

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

      // If legacy expertise is empty, fall back to the new selectedExpertise field
      if (expertise.length === 0) {
        expertise = normalizeField(adv.selectedExpertise);
      }

      // If the adviser ONLY has selectedExpertise (new UI) and no other fields,
      // use it to populate specialization as well so they aren't invisible to matching
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
      // NLP service unavailable or errored
      console.error('[AdviserMatching] Matching service error:', matchError.message);

      const statusCode = matchError.message.includes('unavailable') || matchError.message.includes('timed out')
        ? 503
        : 500;

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
    // Re-attach adviser display info (name, department) from the full data
    const adviserMap = new Map(advisers.map(a => [a.uid, a]));

    const enrichedResults = matchResults
      .filter(r => {
        // Ensure the adviser is still eligible
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
          // Normalize score to 0–100
          score: Math.round(Math.min(Math.max(r.score || 0, 0), 100)),
          compatibilityScore: Math.round(Math.min(Math.max(r.score || 0, 0), 100)),
        };
      });

    // ── Sort by score and take Top 5 ──────────────────────────────────────
    enrichedResults.sort((a, b) => b.score - a.score);
    const top5 = enrichedResults.slice(0, 5);

    // ── Persist Match Results ─────────────────────────────────────────────
    const matchRecord = {
      id: matchCacheKey,
      studentId: user.uid,
      studentName: user.fullName || user.email,
      title: cleanTitle,
      description: cleanDesc,
      results: top5,
      provider: adviserMatchingService.getProviderName(),
      algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
      executionTimeMs,
      generatedAt: new Date().toISOString(),
    };

    try {
      if (db) {
        await db.collection('adviser_matches').doc(matchCacheKey).set(matchRecord);
      }
    } catch (persistErr) {
      // Non-critical — don't fail the request
      console.warn('[AdviserMatching] Failed to persist match results:', persistErr.message);
    }

    // ── Log Summary ───────────────────────────────────────────────────────
    console.log(
      `[AdviserMatching] Match complete\n` +
      `  Research ID: ${matchCacheKey}\n` +
      `  Provider: ${adviserMatchingService.getProviderName()}\n` +
      `  Advisers evaluated: ${advisers.length}\n` +
      `  Top score: ${top5[0]?.score || 0}\n` +
      `  Execution time: ${executionTimeMs}ms\n` +
      `  Algorithm: ${adviserMatchingService.getAlgorithmVersion()}`
    );

    // ── Return Results ────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      cached: false,
      data: top5,
      meta: {
        provider: adviserMatchingService.getProviderName(),
        algorithmVersion: adviserMatchingService.getAlgorithmVersion(),
        advisersEvaluated: advisers.length,
        executionTimeMs,
        generatedAt: matchRecord.generatedAt,
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
