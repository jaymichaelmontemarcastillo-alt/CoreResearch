// server/src/scripts/test_concurrency.js
import fs from 'fs/promises';
import path from 'path';
import { DocumentImportService } from '../services/import/DocumentImportService.js';

async function testConcurrency() {
  console.log('Testing Concurrent DOCX Imports (LibreOffice Engine)');
  
  // Enable LibreOffice
  process.env.USE_LIBREOFFICE_IMPORT = 'true';
  // Mock LibreOffice specifically for environment where it is missing,
  // but the script tests concurrency of the backend architecture.
  
  const testFilePath = path.join(process.cwd(), 'CoreResearch-DOCX-Fidelity-Test.docx');
  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(testFilePath);
  } catch (e) {
    console.error('Run `node src/scripts/generate_fidelity_test.js` first.');
    process.exit(1);
  }

  const importService = new DocumentImportService();
  const mockUser = { uid: 'test-user', fullName: 'Concurrency Tester' };

  async function runBatch(count) {
    console.log(`\n--- Starting batch of ${count} concurrent imports ---`);
    const start = Date.now();
    
    // In actual mongoose, this would try to write. We mock mongoose connection in this script environment if not connected.
    // For pure parse testing, we can directly invoke the parser.
    const promises = Array.from({ length: count }).map(async (_, i) => {
      const pStart = Date.now();
      try {
        const result = await importService.libreOfficeParser.parse(fileBuffer, `TestDoc_${i}.docx`);
        return { success: true, time: Date.now() - pStart, htmlLength: result.html.length };
      } catch (err) {
        return { success: false, error: err.message, time: Date.now() - pStart };
      }
    });

    const results = await Promise.all(promises);
    const totalTime = Date.now() - start;
    
    console.log(`Batch of ${count} completed in ${totalTime}ms`);
    results.forEach((res, i) => {
      if (res.success) {
        console.log(`  Import ${i}: SUCCESS (${res.time}ms) - HTML Length: ${res.htmlLength}`);
      } else {
        console.log(`  Import ${i}: FAILED (${res.time}ms) - Error: ${res.error}`);
      }
    });
  }

  await runBatch(1);
  await runBatch(2);
  await runBatch(5);
}

testConcurrency().catch(console.error);
