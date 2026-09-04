import fs from 'fs';
import path from 'path';

const API_URL = 'https://document.syncfusion.com/web-services/docx-editor/api/documenteditor';
const TEST_FILE = 'C:\\CoreResearch-Official\\CoreResearch\\server\\CoreResearch-DOCX-Fidelity-Test.docx';
const SFDT_OUT = 'C:\\CoreResearch-Official\\CoreResearch\\poc\\syncfusion\\exported.sfdt';

async function runTest() {
  console.log('--- SYNCFUSION ROUND TRIP TEST ---');
  console.log('1. Reading Original DOCX:', TEST_FILE);
  
  if (!fs.existsSync(TEST_FILE)) {
    console.error('File not found!');
    process.exit(1);
  }

  const fileStream = fs.createReadStream(TEST_FILE);
  const formData = new FormData();
  formData.append('files', fileStream);

  console.log('2. Importing DOCX to SFDT via Syncfusion API...');
  try {
    const importRes = await fetch(`${API_URL}/Import`, {
      method: 'POST',
      body: formData,
    });

    if (!importRes.ok) {
      console.error('Import failed with status:', importRes.status);
      const errText = await importRes.text();
      console.error(errText);
      return;
    }

    const sfdt = await importRes.text(); // sometimes it returns raw string, sometimes json
    fs.writeFileSync(SFDT_OUT, sfdt);
    console.log(`SFDT saved to ${SFDT_OUT}. Length: ${sfdt.length} chars.`);

    console.log('3. Exporting SFDT back to DOCX...');
    // The export API format is usually POSTing the sfdt, documentName, and format.
    // However, the public API might restrict this. We will try the standard Save endpoint.
    const formParams = new URLSearchParams();
    formParams.append('fileName', 'exported.docx');
    formParams.append('documentFormat', 'Docx');
    
    // We might need to send the content differently depending on their API version.
    // Let's just output the SFDT and analyze its structure for now if export fails.
    let sfdtObj;
    try {
        sfdtObj = JSON.parse(sfdt);
    } catch(e) {
        sfdtObj = sfdt;
    }
    
    const exportPayload = {
      fileName: 'exported.docx',
      documentFormat: 'Docx',
      content: sfdt // the sfdt string
    };

    const exportRes = await fetch(`${API_URL}/Save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8'
      },
      body: JSON.stringify(exportPayload)
    });

    if (exportRes.ok) {
        const buffer = await exportRes.arrayBuffer();
        fs.writeFileSync('C:\\CoreResearch-Official\\CoreResearch\\poc\\syncfusion\\exported.docx', Buffer.from(buffer));
        console.log('Export SUCCESS: exported.docx created.');
    } else {
        console.error('Export failed with status:', exportRes.status);
        console.error(await exportRes.text());
        console.log('NOTE: Since public API export failed, we will perform structural verification on the SFDT JSON instead.');
    }

  } catch (error) {
    console.error('Test Error:', error);
  }
}

runTest();
