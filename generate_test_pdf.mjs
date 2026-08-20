// Simple script to generate a valid PDF containing "PDF_IMPORT_TEST_BODY_12345"
import fs from 'fs';

function generateTestPdf() {
  const content = `BT
/F1 24 Tf
50 700 Td
(PDF_IMPORT_TEST_BODY_12345) Tj
ET
BT
/F1 14 Tf
50 650 Td
(This is the first paragraph of the imported document.) Tj
ET
BT
/F1 12 Tf
50 600 Td
(This is the second paragraph of the imported document.) Tj
ET`;

  const streamLength = Buffer.byteLength(content, 'utf8');

  const pdf = `%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /MediaBox [0 0 612 792]
  /Contents 4 0 R
  /Resources <<
    /Font <<
      /F1 <<
        /Type /Font
        /Subtype /Type1
        /BaseFont /Helvetica
      >>
    >>
  >>
>>
endobj
4 0 obj
<<
  /Length ${streamLength}
>>
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
<<
  /Size 5
  /Root 1 0 R
>>
startxref
${318 + streamLength + 35}
%%EOF`;

  fs.writeFileSync('c:/CoreResearch-Official/CoreResearch/test_import.pdf', pdf, 'utf8');
  console.log('Successfully generated test_import.pdf');
}

generateTestPdf();
