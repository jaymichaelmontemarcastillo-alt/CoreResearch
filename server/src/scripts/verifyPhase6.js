import dotenv from 'dotenv';
dotenv.config();
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MatchCache } from '../models/MatchCache.js';
import { User } from '../models/User.js';

const runRealDataMigrationSimulation = async () => {
  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[Verify] Connected to In-Memory MongoDB for Real-Data Simulation');

    // Seed mock eligible advisers
    await User.create({
      uid: 'dev-adviser-01',
      email: 'adviser1@test.com',
      role: 'adviser',
      status: 'active',
      is_approved: true,
      fullName: 'Dr. Eleanor Vance',
      expertise: ['Machine Learning', 'NLP'],
    });

    const mockMatches = [
      {
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
        generatedAt: new Date()
      }
    ];

    const migrate = async (passName) => {
      let cacheSuccess = 0;

      for (const cache of mockMatches) {
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
              generatedAt: cache.generatedAt
            }
          },
          { upsert: true }
        );
        cacheSuccess++;
      }
      
      const mongoCaches = await MatchCache.find().lean();
      
      console.log(`\n--- [Verify] ${passName} ---`);
      console.log(`Match Caches: ${cacheSuccess} Migrated | Total in DB: ${mongoCaches.length}`);
      
      return { mongoCaches };
    };

    // Run First Pass
    await migrate('Pass 1 (Initial Migration)');
    
    // Run Second Pass for Idempotency
    const result2 = await migrate('Pass 2 (Idempotency Check)');
    
    // Verify Data Integrity
    console.log(`\n--- [Verify] Integrity Check ---`);
    console.log(`Duplicates created: ${result2.mongoCaches.length > 1 ? 'YES' : 'NO'}`);
    
    console.log('\n[Verify] Simulation Complete.');
  } catch (error) {
    console.error(error);
  } finally {
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
};

runRealDataMigrationSimulation();
