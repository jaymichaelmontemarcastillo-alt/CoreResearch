import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const buffer = fs.readFileSync('c:/CoreResearch-Official/CoreResearch/test_import.pdf');

async function testV2() {
  const parser = new pdf.PDFParse({ data: buffer });
  console.log('parser keys:', Object.keys(parser));
  console.log('parser proto methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
  
  const textResult = await parser.getText();
  console.log('getText result:', textResult);
}

testV2().catch(console.error);
