import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';

const testFile = 'C:\\CoreResearch-Official\\CoreResearch\\client\\node_modules\\mammoth\\test\\test-data\\single-paragraph.docx';

async function extractPageGeometry(docxPath) {
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
    
    const finalSectPr = body['w:sectPr'];
    
    if (finalSectPr) {
      console.log('Final Section Properties:');
      console.log('Page Size:', finalSectPr['w:pgSz']);
      console.log('Page Margins:', finalSectPr['w:pgMar']);
    }

  } catch (err) {
    console.error('Error extracting geometry:', err);
  }
}

extractPageGeometry(testFile);
