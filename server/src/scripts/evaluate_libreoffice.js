// server/src/scripts/evaluate_libreoffice.js
import fs from 'fs/promises';
import path from 'path';
import { DocxParser } from '../services/import/docx/DocxParser.js';
import { LibreOfficeParser } from '../services/import/docx/LibreOfficeParser.js';
import { DocumentIRToTiptap } from '../services/import/tiptap/documentIRToTiptap.js';

async function evaluate() {
  const args = process.argv.slice(2);
  const inputFilePath = args[0];

  if (!inputFilePath) {
    console.error('Usage: node evaluate_libreoffice.js <path/to/test.docx>');
    process.exit(1);
  }

  const docxBuffer = await fs.readFile(inputFilePath);
  const fileName = path.basename(inputFilePath);
  
  const mammothParser = new DocxParser();
  const libreOfficeParser = new LibreOfficeParser();
  const tiptapConverter = new DocumentIRToTiptap();

  console.log(`Evaluating DOCX import for: ${fileName}`);
  console.log('--------------------------------------------------');

  // 1. Run Mammoth
  console.log('Running Pipeline A: Mammoth...');
  const startMammoth = Date.now();
  const mammothResult = await mammothParser.parse(docxBuffer, fileName);
  const mammothTiptap = tiptapConverter.convert(mammothResult);
  const timeMammoth = Date.now() - startMammoth;

  // 2. Run LibreOffice
  console.log('Running Pipeline B: LibreOffice...');
  const startLo = Date.now();
  const loResult = await libreOfficeParser.parse(docxBuffer, fileName);
  const loTiptap = tiptapConverter.convert(loResult);
  const timeLo = Date.now() - startLo;

  // 3. Save Results
  const outDir = path.join(process.cwd(), 'evaluation_results');
  await fs.mkdir(outDir, { recursive: true });

  await fs.writeFile(path.join(outDir, 'mammoth_raw.html'), mammothResult.html);
  await fs.writeFile(path.join(outDir, 'mammoth_tiptap.json'), JSON.stringify(mammothTiptap.tiptapJson, null, 2));

  await fs.writeFile(path.join(outDir, 'libreoffice_raw.html'), loResult.html);
  await fs.writeFile(path.join(outDir, 'libreoffice_tiptap.json'), JSON.stringify(loTiptap.tiptapJson, null, 2));

  // 4. Output Comparison
  console.log('\n--- Results Summary ---');
  console.log(`Mammoth Time: ${timeMammoth}ms`);
  console.log(`LibreOffice Time: ${timeLo}ms`);
  console.log(`Mammoth Extracted Assets: ${mammothResult.assets.length}`);
  console.log(`LibreOffice Extracted Assets: ${loResult.assets.length}`);
  
  const mammothContentLength = JSON.stringify(mammothTiptap.tiptapJson).length;
  const loContentLength = JSON.stringify(loTiptap.tiptapJson).length;
  console.log(`Mammoth Tiptap JSON size: ${mammothContentLength} bytes`);
  console.log(`LibreOffice Tiptap JSON size: ${loContentLength} bytes`);

  console.log('\nFiles saved to ./evaluation_results for manual inspection.');
}

evaluate().catch(console.error);
