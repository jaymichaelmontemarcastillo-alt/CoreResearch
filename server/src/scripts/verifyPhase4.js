import dotenv from 'dotenv';
dotenv.config();
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { Document as MongoDocument } from '../models/Document.js';
import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

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
      },
      {
        id: 'proj-502',
        title: 'AI-Powered Automated Code Quality',
        studentId: 'dev-student-02',
        adviserId: 'dev-adviser-02',
        panelistIds: ['dev-panelist-01'],
        status: 'completed',
      }
    ];
    const map = new Map();
    initialProjects.forEach(p => map.set(p.id, p));
    mockFirestoreDb.set('projects', map);
  }
};

const runVerification = async () => {
  let mongoServer;
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[Verify] Connected to In-Memory MongoDB');

    seedMockProjectsIfEmpty();
    const projectsMap = mockFirestoreDb.get('projects');
    const projectsList = Array.from(projectsMap.values());
    console.log(`[Verify] Found ${projectsList.length} projects in mock Firestore`);

    // 1. Run Migration (First time)
    let successCount = 0;
    for (const proj of projectsList) {
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

      await MongoDocument.findOneAndUpdate(
        { id: proj.id },
        { $set: metadata, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      );
      successCount++;
    }
    console.log(`[Verify] First Migration Pass: ${successCount}/${projectsList.length} migrated`);

    // 2. Verify Document counts
    const mongoDocs = await MongoDocument.find().lean();
    console.log(`[Verify] MongoDB Documents created: ${mongoDocs.length}`);

    // 3. Verify Idempotency (Second Pass)
    for (const proj of projectsList) {
      const metadata = {
        title: proj.title,
        authors: proj.studentId ? [proj.studentId] : [],
        adviser: proj.adviserId || '',
        panelists: Array.isArray(proj.panelistIds) ? proj.panelistIds : [],
        status: proj.status === 'completed' ? 'approved' : 'draft',
      };
      await MongoDocument.findOneAndUpdate(
        { id: proj.id },
        { $set: metadata, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true }
      );
    }
    const mongoDocsPass2 = await MongoDocument.find().lean();
    console.log(`[Verify] Idempotency Pass: MongoDB Documents count is now ${mongoDocsPass2.length} (Expected: ${mongoDocs.length})`);

    // 4. Verify Data Integrity
    const sampleFs = projectsList[0];
    const sampleMd = mongoDocs.find(d => d.id === sampleFs.id);
    console.log(`[Verify] Data Integrity Check for ${sampleFs.id}:`);
    console.log(`  - Title match: ${sampleFs.title === sampleMd.title}`);
    console.log(`  - Authors mapped: ${sampleMd.authors.includes(sampleFs.studentId)}`);
    console.log(`  - Adviser mapped: ${sampleMd.adviser === sampleFs.adviserId}`);
    console.log(`  - Status mapped: ${sampleMd.status === 'draft' && sampleFs.status === 'in_progress'}`);
    
    console.log('[Verify] Complete.');
  } catch (error) {
    console.error(error);
  } finally {
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
};

runVerification();
