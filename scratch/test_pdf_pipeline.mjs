// scratch/test_pdf_pipeline.mjs
import fs from 'fs';
import { PdfParser } from '../server/src/services/import/pdf/PdfParser.js';
import { DocumentIRToTiptap } from '../server/src/services/import/tiptap/documentIRToTiptap.js';

async function runPdfTest() {
  console.log('--- 1. Reading Test PDF ---');
  const buffer = fs.readFileSync('c:/CoreResearch-Official/CoreResearch/test_import.pdf');
  console.log('✓ Read test_import.pdf (size:', buffer.length, 'bytes)');

  console.log('--- 2. Parsing with PdfParser ---');
  const parser = new PdfParser();
  const ir = await parser.parse(buffer, 'test_import.pdf');

  console.log('✓ DocumentIR Title:', ir.metadata.title);
  console.log('✓ DocumentIR Page Count:', ir.metadata.pageCount);
  console.log('✓ DocumentIR Node Count:', ir.nodes.length);

  console.log('--- 3. Converting to Tiptap JSON ---');
  const converter = new DocumentIRToTiptap();
  const { tiptapJson, plainText } = converter.convert(ir);

  console.log('✓ Tiptap Doc Nodes:', tiptapJson.content.length);
  console.log('✓ Extracted Plain Text:\n', plainText);

  const containsTestString = plainText.includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('Test token preserved:', containsTestString ? 'PASS ✓' : 'FAIL ✗');

  if (containsTestString && tiptapJson.content.length > 0) {
    console.log('\n🎉 ALL PDF PIPELINE TESTS PASSED SUCCESSFULLY!');
  } else {
    throw new Error('PDF pipeline test assertion failed.');
  }
}

runPdfTest().catch((err) => {
  console.error('PDF test error:', err);
  process.exit(1);
});
