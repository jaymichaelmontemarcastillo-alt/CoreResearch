import fs from 'fs';

async function testHttpImport() {
  const fileBuffer = fs.readFileSync('c:/CoreResearch-Official/CoreResearch/test_import.pdf');
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, 'test_import.pdf');

  console.log('Sending multipart POST to http://localhost:5000/api/documents/import...');
  const res = await fetch('http://localhost:5000/api/documents/import', {
    method: 'POST',
    body: formData,
    headers: {
      'x-user-id': 'test-user-1',
      'x-user-name': 'Test User',
      'x-user-role': 'student',
    },
  });

  const data = await res.json();
  console.log('HTTP Status:', res.status);
  console.log('Response Success:', data.success);
  console.log('Created Document ID:', data.document?.id);
  console.log('Created Document Title:', data.document?.title);
  console.log('Document Content Top-Level Count:', data.document?.content?.content?.length);
  console.log('First Paragraph Node:', JSON.stringify(data.document?.content?.content?.[0], null, 2));

  const hasTargetText = JSON.stringify(data.document).includes('PDF_IMPORT_TEST_BODY_12345');
  console.log('Does HTTP response contain "PDF_IMPORT_TEST_BODY_12345"?', hasTargetText ? 'YES' : 'NO');
}

testHttpImport().catch(console.error);
