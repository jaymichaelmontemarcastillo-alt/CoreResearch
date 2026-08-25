import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { MatchCache } from '../models/MatchCache.js';
import { User } from '../models/User.js';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

const migratePhase6 = async () => {
  console.log('[Phase 6] Starting Adviser NLP Matching Migration...');

  if (mongoose.connection.readyState !== 1) {
    console.error('[Phase 6] ERROR: MongoDB not connected. Cannot migrate.');
    process.exit(1);
  }

  let firestoreCaches = [];
  let cacheSuccess = 0;
  let cacheSkipped = 0;

  try {
    if (isDevMockMode) {
      console.log('[Phase 6] Reading from Mock Data...');
      
      // Inject some mock caches if none exist
      if (!mockFirestoreDb.has('adviser_matches')) {
        const mockMatches = new Map();
        mockMatches.set('match_stu-01_machine_learning', {
          id: 'match_stu-01_machine_learning',
          studentId: 'stu-01',
          studentName: 'Alex Rivera',
          title: 'Machine Learning in Agriculture',
          description: 'A study on crop yield.',
          results: [{
            adviserId: 'dev-adviser-01', adviserName: 'Dr. Eleanor Vance',
            department: 'Computer Studies', score: 85, compatibilityScore: 85,
            matchedInterests: ['Machine Learning'], matchedKeywords: ['AI'],
            explanation: 'High match based on Machine Learning.'
          }],
          provider: 'NLPAdviserMatchingProvider',
          algorithmVersion: 'v2.1',
          executionTimeMs: 450,
          generatedAt: new Date().toISOString()
        });
        mockFirestoreDb.set('adviser_matches', mockMatches);
      }
      
      const cacheMap = mockFirestoreDb.get('adviser_matches');
      if (cacheMap) {
        firestoreCaches = Array.from(cacheMap.values());
      }
    } else {
      console.log('[Phase 6] Reading from actual Firestore...');
      const matchesSnap = await db.collection('adviser_matches').get();
      firestoreCaches = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    console.log(`[Phase 6] Found ${firestoreCaches.length} Match Caches.`);

    // Migrate Match Caches
    for (const cache of firestoreCaches) {
      try {
        await MatchCache.findOneAndUpdate(
          { id: cache.id },
          {
            $set: {
              studentId: cache.studentId,
              studentName: cache.studentName,
              title: cache.title,
              description: cache.description,
              results: cache.results,
              provider: cache.provider,
              algorithmVersion: cache.algorithmVersion,
              executionTimeMs: cache.executionTimeMs,
              generatedAt: cache.generatedAt ? new Date(cache.generatedAt) : new Date()
            }
          },
          { upsert: true }
        );
        cacheSuccess++;
      } catch (err) {
        console.error(`[Phase 6] Failed migrating cache ${cache.id}:`, err.message);
        cacheSkipped++;
      }
    }

    // Optional: We verify that Adviser Users exist in MongoDB, though Phase 1-3 already dual-wrote them.
    const adviserCount = await User.countDocuments({ role: 'adviser' });
    console.log(`[Phase 6] Verified ${adviserCount} eligible advisers exist in MongoDB User collection.`);

    console.log(`\n[Phase 6] Migration Complete!`);
    console.log(`  - Match Caches: ${cacheSuccess} Migrated | ${cacheSkipped} Skipped (Errors)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('[Phase 6] Migration Error:', error);
    process.exit(1);
  }
};

migratePhase6();
