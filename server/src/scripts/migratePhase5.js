import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Comment } from '../models/Comment.js';
import { Review } from '../models/Review.js';
import { Schedule } from '../models/Schedule.js';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

// Mock setup functions to ensure maps are populated
const seedMockManuscriptsIfEmpty = () => {
  if (!mockFirestoreDb.has('manuscript_comments')) {
    const commentsMap = new Map();
    commentsMap.set('proj-501', [
      {
        id: 'comm-101',
        projectId: 'proj-501',
        text: 'Consider expanding this literature review.',
        selectedText: 'Urban farming has rapidly emerged',
        section: 'Introduction',
        page: 1,
        authorId: 'dev-adviser-01',
        authorName: 'Dr. Eleanor Vance',
        authorRole: 'adviser',
        createdAt: new Date().toISOString(),
        resolved: false,
        replies: []
      }
    ]);
    mockFirestoreDb.set('manuscript_comments', commentsMap);
  }
};

const seedMockReviewsIfEmpty = () => {
  if (!mockFirestoreDb.has('reviews')) {
    const map = new Map();
    map.set('rev-201', {
      id: 'rev-201',
      manuscriptId: 'ms-v1.0',
      chapter: 'Chapter 2 - Literature Review',
      comment: 'Expand section 2.3.',
      reviewerId: 'dev-adviser-01',
      reviewerName: 'Dr. Eleanor Vance',
      reviewerRole: 'adviser',
      status: 'addressed',
      studentResponse: 'Updated.',
      createdAt: new Date().toISOString()
    });
    // Add a dangling review for verification purposes
    map.set('rev-999-dangling', {
      id: 'rev-999-dangling',
      manuscriptId: 'ms-v99.0-does-not-exist',
      comment: 'This should be skipped.',
      reviewerId: 'dev-adviser-01'
    });
    mockFirestoreDb.set('reviews', map);
  }
};

const seedMockSchedulesIfEmpty = () => {
  if (!mockFirestoreDb.has('schedules')) {
    const map = new Map();
    map.set('sch-301', {
      id: 'sch-301',
      projectId: 'proj-501',
      projectTitle: 'Smart IoT',
      studentName: 'Alex Rivera',
      defenseType: 'proposal_defense',
      date: '2026-08-14',
      startTime: '10:00',
      endTime: '11:30',
      venue: 'Room 402',
      panelistIds: ['dev-panelist-01'],
      panelistNames: ['Prof. Marcus Chen'],
      status: 'scheduled',
      createdAt: new Date().toISOString()
    });
    mockFirestoreDb.set('schedules', map);
  }
};

const migratePhase5 = async () => {
  console.log('[Phase 5] Starting Comments, Reviews, and Schedules Migration...');

  if (mongoose.connection.readyState !== 1) {
    console.error('[Phase 5] ERROR: MongoDB not connected. Cannot migrate.');
    process.exit(1);
  }

  let firestoreComments = [];
  let firestoreReviews = [];
  let firestoreSchedules = [];

  // Data sets to track relationship validation
  const validProjectIds = new Set();
  const validManuscriptIds = new Set();

  try {
    if (isDevMockMode) {
      console.log('[Phase 5] Reading from Mock Data...');
      seedMockManuscriptsIfEmpty();
      seedMockReviewsIfEmpty();
      seedMockSchedulesIfEmpty();

      // Seed valid IDs for mock run
      validProjectIds.add('proj-501');
      validManuscriptIds.add('ms-v1.0');
      validManuscriptIds.add('ms-v1.1');

      // Comments
      const commentsMap = mockFirestoreDb.get('manuscript_comments');
      if (commentsMap) {
        for (const [projectId, comments] of commentsMap.entries()) {
          firestoreComments.push(...comments);
        }
      }

      // Reviews
      const revMap = mockFirestoreDb.get('reviews');
      if (revMap) {
        firestoreReviews = Array.from(revMap.values());
      }

      // Schedules
      const schMap = mockFirestoreDb.get('schedules');
      if (schMap) {
        firestoreSchedules = Array.from(schMap.values());
      }
    } else {
      console.log('[Phase 5] Reading from actual Firestore...');
      
      // Load valid relational IDs first
      const projectsSnap = await db.collection('projects').get();
      projectsSnap.docs.forEach(doc => validProjectIds.add(doc.id));
      
      const manuscriptsSnap = await db.collection('manuscript_versions').get();
      manuscriptsSnap.docs.forEach(doc => validManuscriptIds.add(doc.id));

      // Comments
      const draftsSnap = await db.collection('manuscript_drafts').get();
      for (const draftDoc of draftsSnap.docs) {
        const commentsSnap = await draftDoc.ref.collection('comments').get();
        for (const commentDoc of commentsSnap.docs) {
          firestoreComments.push({ id: commentDoc.id, projectId: draftDoc.id, ...commentDoc.data() });
        }
      }

      // Reviews
      const reviewsSnap = await db.collection('reviews').get();
      firestoreReviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Schedules
      const schedulesSnap = await db.collection('schedules').get();
      firestoreSchedules = schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    console.log(`[Phase 5] Found ${firestoreComments.length} Comments, ${firestoreReviews.length} Reviews, ${firestoreSchedules.length} Schedules.`);

    let commSuccess = 0, commSkipped = 0;
    let revSuccess = 0, revSkipped = 0;
    let schSuccess = 0, schSkipped = 0;

    // Migrate Comments
    for (const c of firestoreComments) {
      if (!validProjectIds.has(c.projectId)) {
        console.warn(`[Phase 5] Skipped comment ${c.id}: Project ${c.projectId} does not exist.`);
        commSkipped++;
        continue;
      }
      try {
        await Comment.findOneAndUpdate(
          { id: c.id },
          {
            $set: {
              documentId: c.projectId,
              authorUid: c.authorId,
              authorName: c.authorName || 'Unknown',
              authorRole: c.authorRole || 'student',
              content: c.text,
              resolved: c.resolved || false,
              selectedText: c.selectedText || '',
              section: c.section || 'General',
              page: c.page || 1,
              replies: c.replies || [],
            },
            $setOnInsert: { createdAt: c.createdAt ? new Date(c.createdAt) : new Date() }
          },
          { upsert: true }
        );
        commSuccess++;
      } catch (err) {
        console.error(`[Phase 5] Failed migrating comment ${c.id}:`, err.message);
      }
    }

    // Migrate Reviews
    for (const r of firestoreReviews) {
      if (!validManuscriptIds.has(r.manuscriptId)) {
        console.warn(`[Phase 5] Skipped review ${r.id}: Manuscript version ${r.manuscriptId} does not exist.`);
        revSkipped++;
        continue;
      }
      try {
        await Review.findOneAndUpdate(
          { id: r.id },
          {
            $set: {
              manuscriptId: r.manuscriptId,
              reviewerId: r.reviewerId,
              reviewerName: r.reviewerName || 'Adviser',
              reviewerRole: r.reviewerRole || 'adviser',
              chapter: r.chapter || 'General',
              comment: r.comment,
              status: r.status || 'pending',
              studentResponse: r.studentResponse || ''
            },
            $setOnInsert: { createdAt: r.createdAt ? new Date(r.createdAt) : new Date() }
          },
          { upsert: true }
        );
        revSuccess++;
      } catch (err) {
        console.error(`[Phase 5] Failed migrating review ${r.id}:`, err.message);
      }
    }

    // Migrate Schedules
    for (const s of firestoreSchedules) {
      if (!validProjectIds.has(s.projectId)) {
        console.warn(`[Phase 5] Skipped schedule ${s.id}: Project ${s.projectId} does not exist.`);
        schSkipped++;
        continue;
      }
      try {
        const panelists = s.panelistIds ? s.panelistIds.map((pid, idx) => ({
          id: pid,
          name: s.panelistNames ? s.panelistNames[idx] : 'Panelist',
          email: '',
          role: 'panelist'
        })) : [];

        await Schedule.findOneAndUpdate(
          { id: s.id },
          {
            $set: {
              projectId: s.projectId,
              projectTitle: s.projectTitle,
              date: s.date,
              time: s.startTime,
              location: s.venue,
              type: s.defenseType === 'proposal_defense' ? 'proposal' : 'final_defense',
              status: s.status || 'scheduled',
              panelists: panelists
            },
            $setOnInsert: { createdAt: s.createdAt ? new Date(s.createdAt) : new Date() }
          },
          { upsert: true }
        );
        schSuccess++;
      } catch (err) {
        console.error(`[Phase 5] Failed migrating schedule ${s.id}:`, err.message);
      }
    }

    console.log(`\n[Phase 5] Migration Complete!`);
    console.log(`  - Comments: ${commSuccess} Migrated | ${commSkipped} Skipped (Dangling)`);
    console.log(`  - Reviews:  ${revSuccess} Migrated | ${revSkipped} Skipped (Dangling)`);
    console.log(`  - Schedules:${schSuccess} Migrated | ${schSkipped} Skipped (Dangling)\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('[Phase 5] Migration Error:', error);
    process.exit(1);
  }
};

migratePhase5();
