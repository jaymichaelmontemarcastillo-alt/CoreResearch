import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { documentImportService } from '../services/import/DocumentImportService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
  await connectDB();
  
  // Find a test docx or create a dummy buffer if needed.
  // We'll see if there's any test docx in uploads/documents
  console.log("Looking for test docx files...");
  
  // As a quick test, we will just pass a tiny valid DOCX buffer, or we can look for one in the repo.
  // Wait, I saw test_import.pdf earlier. Maybe there's a docx? Let me just search for *.docx in the repo.
  // Actually, I can just create a dummy DOCX using AdmZip, but Mammoth might reject it.
  // Let's just create a basic script that can be run if a docx is provided.
  
  console.log("Please run this with a docx file path as argument, e.g. node test_mammoth_import.mjs test.docx");
  
  if (process.argv[2]) {
    const filePath = path.resolve(process.argv[2]);
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Starting import for ${filePath}...`);
    try {
      const doc = await documentImportService.importDocument({
        fileBuffer,
        fileName: path.basename(filePath),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: fileBuffer.length,
        userProfile: { uid: 'test-user', fullName: 'Test User', role: 'student' }
      });
      console.log('Import successful!');
      console.log('Title:', doc.title);
      console.log('Tiptap JSON:', JSON.stringify(doc.content.tiptap).substring(0, 500) + '...');
      console.log('GridFS URL:', doc.sourceDocument.url);
    } catch (e) {
      console.error('Import failed:', e);
    }
  }
  
  mongoose.connection.close();
}

runTest();
