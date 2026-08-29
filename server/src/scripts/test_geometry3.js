import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';

const testFile = 'C:\\CoreResearch-Official\\CoreResearch\\client\\node_modules\\mammoth\\test\\test-data\\single-paragraph.docx';

async function extractParagraphGeometry(docxPath) {
  try {
    const zip = new AdmZip(docxPath);
    const documentXml = zip.readAsText('word/document.xml');
    
    if (!documentXml) {
      console.log('No word/document.xml found');
      return;
    }
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(documentXml);
    
    const body = parsed['w:document']?.['w:body'];
    if (!body) return;
    
    const paragraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
    
    paragraphs.forEach((p, i) => {
      if (!p) return;
      const pPr = p['w:pPr'];
      if (pPr) {
        console.log(`Paragraph ${i} Properties:`);
        if (pPr['w:ind']) console.log('  Indentation:', pPr['w:ind']);
        if (pPr['w:spacing']) console.log('  Spacing:', pPr['w:spacing']);
        if (pPr['w:jc']) console.log('  Alignment:', pPr['w:jc']);
        if (pPr['w:sectPr']) console.log('  Section Break:', pPr['w:sectPr']);
      }
    });

  } catch (err) {
    console.error('Error extracting geometry:', err);
  }
}

extractParagraphGeometry(testFile);
