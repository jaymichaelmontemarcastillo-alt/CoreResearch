import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Document } from '../models/Document.js';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';
import { connectDB } from '../config/db.js';

// Fallback mock seeds just in case the memory DB is empty during local migration
const seedMockProjectsIfEmpty = () => {
  if (!mockFirestoreDb.has('projects')) {
    const initialProjects = [
      {
        id: 'proj-501',
        title: 'Smart IoT Moisture & Nutrient Sensing System for Urban Farming',
        studentId: 'dev-student-01',
        adviserId: 'dev-adviser-01',
        panelistIds: ['dev-panelist-01', 'dev-panelist-02'],
        status: 'in_progress',
      }
    ];
    const map = new Map();
    initialProjects.forEach(p => map.set(p.id, p));
    mockFirestoreDb.set('projects', map);
  }
};

const migrateManuscriptMetadata = async () => {
  console.log('[Phase 4] Starting Manuscript Metadata Migration...');
  
  await connectDB();
  
  if (mongoose.connection.readyState !== 1) {
    console.error('[Phase 4] ERROR: MongoDB not connected. Cannot migrate.');
    process.exit(1);
  }

  let projectsList = [];

  // 1. Fetch from Firestore or Mock
  if (isDevMockMode || !db) {
    console.log('[Phase 4] Reading from mockFirestoreDb (projects)...');
    seedMockProjectsIfEmpty();
    const map = mockFirestoreDb.get('projects');
    projectsList = Array.from(map.values());
  } else {
    console.log('[Phase 4] Reading from production Firestore (research_projects)...');
    const snapshot = await db.collection('research_projects').get();
    projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  console.log(`[Phase 4] Found ${projectsList.length} projects to migrate.`);

  // 2. Upsert into MongoDB
  let successCount = 0;
  for (const proj of projectsList) {
    try {
      // Map project status to manuscript status logically
      let docStatus = 'draft';
      if (proj.status === 'completed') docStatus = 'approved';
      if (proj.status === 'in_progress') docStatus = 'draft';

      const metadata = {
        title: proj.title || 'Untitled Manuscript',
        authors: proj.studentId ? [proj.studentId] : [],
        adviser: proj.adviserId || '',
        panelists: Array.isArray(proj.panelistIds) ? proj.panelistIds : [],
        status: docStatus,
      };

      await Document.findOneAndUpdate(
        { id: proj.id },
        { 
          $set: metadata,
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true, new: true }
      );
      
      console.log(`  -> Migrated project metadata for ID: ${proj.id}`);
      successCount++;
    } catch (err) {
      console.error(`  -> Failed to migrate ID: ${proj.id}`, err.message);
    }
  }

  console.log(`[Phase 4] Migration complete. Successfully migrated ${successCount}/${projectsList.length} manuscripts.`);
  process.exit(0);
};

migrateManuscriptMetadata();
