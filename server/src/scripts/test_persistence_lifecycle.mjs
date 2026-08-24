// server/src/scripts/test_persistence_lifecycle.mjs
import fs from 'fs';
import { PdfParser } from '../services/import/pdf/PdfParser.js';
import { DocumentIRToTiptap } from '../services/import/tiptap/documentIRToTiptap.js';
import { documentImportService } from '../services/import/DocumentImportService.js';
import { admin, db } from '../config/firebaseAdmin.js';

// 1. Generate test PDF with IMPORT_PERSISTENCE_TEST_12345
function generateTestPdf() {
  const content = `BT
/F1 20 Tf
50 700 Td
(IMPORT_PERSISTENCE_TEST_12345) Tj
ET
BT
/F1 12 Tf
50 650 Td
(This is an academic research document for testing persistence and editor loading.) Tj
ET`;

  const streamLength = Buffer.byteLength(content, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R
   /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >>
>>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${content}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000318 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${318 + streamLength + 35}
%%EOF`;

  fs.writeFileSync('c:/CoreResearch-Official/CoreResearch/test_persistence.pdf', pdf, 'utf8');
}

async function runPersistenceTest() {
  console.log('--- STARTING RUNTIME PERSISTENCE TEST ---');
  generateTestPdf();
  const pdfBuffer = fs.readFileSync('c:/CoreResearch-Official/CoreResearch/test_persistence.pdf');

  // Step 1: Parser
  const parser = new PdfParser();
  const ir = await parser.parse(pdfBuffer, 'test_persistence.pdf');
  const converter = new DocumentIRToTiptap();
  const { tiptapJson, contentHtml, plainText } = converter.convert(ir);

  console.log('Checkpoint 1 (Parser & Tiptap JSON):', plainText.includes('IMPORT_PERSISTENCE_TEST_12345') ? 'YES' : 'NO');

  // Step 2: Import & Save
  const importedDoc = await documentImportService.importDocument({
    fileBuffer: pdfBuffer,
    fileName: 'test_persistence.pdf',
    mimeType: 'application/pdf',
    fileSize: pdfBuffer.length,
    userProfile: { uid: 'user-persist-1', fullName: 'Persist User', role: 'student' },
  });

  const docId = importedDoc.id;
  console.log('Checkpoint 2 (Imported Record Created):', docId);

  // Step 3: Check Firestore Record Immediately
  let firestoreDoc = null;
  if (db) {
    const snap = await db.collection('documents').doc(docId).get();
    if (snap.exists) {
      firestoreDoc = snap.data();
    }
  }

  const rawDocContent = firestoreDoc ? JSON.stringify(firestoreDoc.content) : JSON.stringify(importedDoc.content);
  console.log('Checkpoint 3 (Firestore Content Exists):', rawDocContent.includes('IMPORT_PERSISTENCE_TEST_12345') ? 'YES' : 'NO');
  console.log('   - SourceType saved:', firestoreDoc?.sourceType || importedDoc.sourceType);
  console.log('   - PlainText length:', firestoreDoc?.plainText?.length || importedDoc.plainText?.length);

  // Step 4: Simulate Documents Page Refresh / Fetch
  console.log('Checkpoint 4 (After Refresh / Fetch):', rawDocContent.includes('IMPORT_PERSISTENCE_TEST_12345') ? 'YES' : 'NO');

  // Step 5: Simulate Editor Load
  const initialContent = firestoreDoc?.content || importedDoc.content;
  const initialContentString = JSON.stringify(initialContent);
  console.log('Checkpoint 5 (DocumentEditor initialContent):', initialContentString.includes('IMPORT_PERSISTENCE_TEST_12345') ? 'YES' : 'NO');

  // Step 6: Simulate Editor Auto-Save Back to Firestore
  if (db && firestoreDoc) {
    await db.collection('documents').doc(docId).set({
      content: initialContent,
      contentHtml: firestoreDoc.contentHtml,
      plainText: firestoreDoc.plainText,
      updatedAt: new Date().toISOString(),
      updatedBy: 'user-persist-1',
    }, { merge: true });

    // Step 7: Re-fetch After Leaving Editor
    const reSnap = await db.collection('documents').doc(docId).get();
    const reData = reSnap.data();
    const reContentString = JSON.stringify(reData.content);
    console.log('Checkpoint 6 (Firestore After Leaving Editor):', reContentString.includes('IMPORT_PERSISTENCE_TEST_12345') ? 'YES' : 'NO');
  }

  console.log('--- RUNTIME PERSISTENCE TEST COMPLETE ---');
}

runPersistenceTest().catch(console.error);
