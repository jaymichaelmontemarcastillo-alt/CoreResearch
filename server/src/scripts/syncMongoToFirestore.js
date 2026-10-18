import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function syncMongoToFirestore() {
  console.log('[Sync] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[Sync] MongoDB connected:', mongoose.connection.name);

  const mongoDocs = await mongoose.connection.collection('repositorypublications').find({}).toArray();
  console.log(`[Sync] Found ${mongoDocs.length} documents in MongoDB 'repositorypublications'.`);

  let syncedCount = 0;
  let batch = db.batch();
  let operationsInBatch = 0;

  for (const doc of mongoDocs) {
    const docId = doc.id || String(doc._id);

    const firestoreData = {
      id: docId,
      projectId: doc.projectId || 'proj-501',
      manuscriptId: doc.manuscriptId || '',
      title: doc.title || 'Untitled Research',
      authors: Array.isArray(doc.authors) ? doc.authors : [String(doc.authors || 'Student Researcher')],
      adviserName: doc.adviserName || 'Faculty Adviser',
      department: doc.department || 'Computer Science',
      publicationYear: Number(doc.publicationYear) || new Date().getFullYear(),
      abstract: doc.abstract || 'No abstract provided.',
      keywords: Array.isArray(doc.keywords) ? doc.keywords : [],
      pdfUrl: doc.pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      citation: doc.citation || `${doc.title}. (${doc.publicationYear || new Date().getFullYear()}). CoreResearch Institutional Repository.`,
      publicationStatus: doc.publicationStatus || 'approved',
      rejectionReason: doc.rejectionReason || '',
      viewsCount: Number(doc.viewsCount) || 1,
      downloadsCount: Number(doc.downloadsCount) || 0,
      publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : new Date().toISOString(),
      acceptedTerms: Boolean(doc.acceptedTerms),
      acceptedBy: doc.acceptedBy || '',
      acceptedByName: doc.acceptedByName || '',
      acceptedAt: doc.acceptedAt ? new Date(doc.acceptedAt).toISOString() : null,
      termsVersion: doc.termsVersion || '1.0'
    };

    const docRef = db.collection('repository_publications').doc(docId);
    batch.set(docRef, firestoreData, { merge: true });
    operationsInBatch++;
    syncedCount++;

    // Firestore batch limit is 500 operations
    if (operationsInBatch >= 400) {
      console.log(`[Sync] Committing batch of ${operationsInBatch} writes...`);
      await batch.commit();
      batch = db.batch();
      operationsInBatch = 0;
    }
  }

  if (operationsInBatch > 0) {
    console.log(`[Sync] Committing final batch of ${operationsInBatch} writes...`);
    await batch.commit();
  }

  console.log(`[Sync] Successfully synced ${syncedCount} repository publications to Firestore!`);

  // Verify Firestore count
  const verifySnap = await db.collection('repository_publications').get();
  console.log(`[Sync] Verified: Firestore 'repository_publications' now has ${verifySnap.size} documents.`);

  process.exit(0);
}

syncMongoToFirestore().catch(err => {
  console.error('[Sync] Error during sync:', err);
  process.exit(1);
});
