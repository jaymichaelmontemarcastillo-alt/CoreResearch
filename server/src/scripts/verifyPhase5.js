import dotenv from 'dotenv';
dotenv.config();
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Review } from '../models/Review.js';
import { Schedule } from '../models/Schedule.js';
import { mockFirestoreDb } from '../config/firebaseAdmin.js';

const seedMockData = () => {
  const commentsMap = new Map();
  commentsMap.set('proj-501', [{
      id: 'comm-101', projectId: 'proj-501', text: 'Consider expanding this literature review.',
      authorId: 'dev-adviser-01', authorName: 'Dr. Eleanor Vance', authorRole: 'adviser',
      createdAt: new Date().toISOString(), resolved: false, replies: []
  }]);
  mockFirestoreDb.set('manuscript_comments', commentsMap);

  const mapRev = new Map();
  mapRev.set('rev-201', {
    id: 'rev-201', manuscriptId: 'ms-v1.0', chapter: 'Chapter 2', comment: 'Expand section 2.3.',
    reviewerId: 'dev-adviser-01', reviewerName: 'Dr. Eleanor Vance', reviewerRole: 'adviser',
    status: 'addressed', studentResponse: 'Updated.', createdAt: new Date().toISOString()
  });
  mapRev.set('rev-999-dangling', {
    id: 'rev-999-dangling', manuscriptId: 'ms-v99.0-does-not-exist', comment: 'This should be skipped.'
  });
  mockFirestoreDb.set('reviews', mapRev);

  const mapSch = new Map();
  mapSch.set('sch-301', {
    id: 'sch-301', projectId: 'proj-501', projectTitle: 'Smart IoT', studentName: 'Alex Rivera',
    defenseType: 'proposal_defense', date: '2026-08-14', startTime: '10:00', endTime: '11:30',
    venue: 'Room 402', panelistIds: ['dev-panelist-01'], panelistNames: ['Prof. Marcus Chen'],
    status: 'scheduled', createdAt: new Date().toISOString()
  });
  mockFirestoreDb.set('schedules', mapSch);
};

const runRealDataMigrationSimulation = async () => {
  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[Verify] Connected to In-Memory MongoDB for Real-Data Simulation');

    seedMockData();

    // Emulate what migratePhase5.js does exactly
    const validProjectIds = new Set(['proj-501']);
    const validManuscriptIds = new Set(['ms-v1.0']);

    const commentsMap = mockFirestoreDb.get('manuscript_comments');
    const firestoreComments = commentsMap.get('proj-501') || [];
    const revMap = mockFirestoreDb.get('reviews');
    const firestoreReviews = Array.from(revMap.values());
    const schMap = mockFirestoreDb.get('schedules');
    const firestoreSchedules = Array.from(schMap.values());

    const migrate = async (passName) => {
      let commSuccess = 0, commSkipped = 0;
      let revSuccess = 0, revSkipped = 0;
      let schSuccess = 0, schSkipped = 0;

      for (const c of firestoreComments) {
        if (!validProjectIds.has(c.projectId)) { commSkipped++; continue; }
        await Comment.findOneAndUpdate({ id: c.id }, { $set: { documentId: c.projectId, authorUid: c.authorId, content: c.text } }, { upsert: true });
        commSuccess++;
      }
      for (const r of firestoreReviews) {
        if (!validManuscriptIds.has(r.manuscriptId)) { revSkipped++; continue; }
        await Review.findOneAndUpdate({ id: r.id }, { $set: { manuscriptId: r.manuscriptId, reviewerId: r.reviewerId, comment: r.comment } }, { upsert: true });
        revSuccess++;
      }
      for (const s of firestoreSchedules) {
        if (!validProjectIds.has(s.projectId)) { schSkipped++; continue; }
        await Schedule.findOneAndUpdate({ id: s.id }, { $set: { projectId: s.projectId, date: s.date } }, { upsert: true });
        schSuccess++;
      }
      
      const mongoDocsComm = await Comment.find().lean();
      const mongoDocsRev = await Review.find().lean();
      const mongoDocsSch = await Schedule.find().lean();
      
      console.log(`\n--- [Verify] ${passName} ---`);
      console.log(`Comments:  ${commSuccess} Migrated | ${commSkipped} Skipped (Dangling) | Total in DB: ${mongoDocsComm.length}`);
      console.log(`Reviews:   ${revSuccess} Migrated | ${revSkipped} Skipped (Dangling) | Total in DB: ${mongoDocsRev.length}`);
      console.log(`Schedules: ${schSuccess} Migrated | ${schSkipped} Skipped (Dangling) | Total in DB: ${mongoDocsSch.length}`);
      
      return { mongoDocsComm, mongoDocsRev, mongoDocsSch };
    };

    // Run First Pass
    await migrate('Pass 1 (Initial Migration)');
    
    // Run Second Pass for Idempotency
    const result2 = await migrate('Pass 2 (Idempotency Check)');
    
    // Verify Data Integrity
    console.log(`\n--- [Verify] Integrity Check ---`);
    console.log(`Review 'rev-999-dangling' exists in Mongo: ${result2.mongoDocsRev.some(r => r.id === 'rev-999-dangling')}`);
    
    console.log('\n[Verify] Simulation Complete.');
  } catch (error) {
    console.error(error);
  } finally {
    if (mongoose.connection) await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
  }
};

runRealDataMigrationSimulation();
