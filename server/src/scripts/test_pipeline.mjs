import fs from 'fs';
import { PdfParser } from '../services/import/pdf/PdfParser.js';
import { DocumentIRToTiptap } from '../services/import/tiptap/documentIRToTiptap.js';
import { documentImportService } from '../services/import/DocumentImportService.js';

async function runTest() {
  console.log('=== CHECKPOINT 1: PDF FILE ===');
  const pdfBuffer = fs.readFileSync('c:/CoreResearch-Official/CoreResearch/test_import.pdf');
  const pdfString = pdfBuffer.toString('utf8');
  const hasInRawPdf = pdfString.includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('Raw PDF contains "PDF_IMPORT_TEST_BODY_12345"?', hasInRawPdf ? 'YES' : 'NO');

  console.log('\n=== CHECKPOINT 2: PdfParser & DocumentIR ===');
  const parser = new PdfParser();
  const ir = await parser.parse(pdfBuffer, 'test_import.pdf');
  console.log('DocumentIR Metadata:', ir.metadata);
  console.log('DocumentIR Node Count:', ir.nodes.length);
  console.log('DocumentIR Nodes:', JSON.stringify(ir.nodes, null, 2));

  const irJson = JSON.stringify(ir);
  const hasInIr = irJson.includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('DocumentIR contains "PDF_IMPORT_TEST_BODY_12345"?', hasInIr ? 'YES' : 'NO');

  console.log('\n=== CHECKPOINT 3: DocumentIR -> Tiptap JSON ===');
  const converter = new DocumentIRToTiptap();
  const { tiptapJson, contentHtml, plainText } = converter.convert(ir);
  console.log('Tiptap JSON Content Count:', tiptapJson.content?.length);
  console.log('Tiptap JSON:', JSON.stringify(tiptapJson, null, 2));
  console.log('Plain Text:', plainText);
  console.log('HTML:', contentHtml);

  const tiptapString = JSON.stringify(tiptapJson);
  const hasInTiptap = tiptapString.includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('Tiptap JSON contains "PDF_IMPORT_TEST_BODY_12345"?', hasInTiptap ? 'YES' : 'NO');

  console.log('\n=== CHECKPOINT 4 & 5: DocumentImportService & Firestore Data ===');
  const importedDoc = await documentImportService.importDocument({
    fileBuffer: pdfBuffer,
    fileName: 'test_import.pdf',
    mimeType: 'application/pdf',
    fileSize: pdfBuffer.length,
    userProfile: { uid: 'test-user-1', fullName: 'Test User', role: 'student' },
  });

  console.log('Created Document ID:', importedDoc.id);
  console.log('Created Document Title:', importedDoc.title);
  console.log('Created Document SourceType:', importedDoc.sourceType);
  console.log('Created Document Content Top-Level Count:', importedDoc.content?.content?.length);
  console.log('Created Document First Node:', JSON.stringify(importedDoc.content?.content?.[0], null, 2));

  const docString = JSON.stringify(importedDoc.content);
  const hasInDoc = docString.includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('Imported Document Record contains "PDF_IMPORT_TEST_BODY_12345"?', hasInDoc ? 'YES' : 'NO');
}

runTest().catch(console.error);
