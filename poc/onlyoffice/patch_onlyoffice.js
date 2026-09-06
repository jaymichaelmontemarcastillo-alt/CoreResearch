const fs = require('fs');
const { execSync } = require('child_process');

try {
  const localJsonStr = execSync('docker exec bccb89516b9f cat /etc/onlyoffice/documentserver/local.json').toString();
  const localJson = JSON.parse(localJsonStr);
  
  if (!localJson.services.CoAuthoring.requestDefaults) {
    localJson.services.CoAuthoring.requestDefaults = {};
  }
  localJson.services.CoAuthoring.requestDefaults.rejectUnauthorized = false;
  
  if (!localJson.services.CoAuthoring['request-filtering-agent']) {
    localJson.services.CoAuthoring['request-filtering-agent'] = {};
  }
  localJson.services.CoAuthoring['request-filtering-agent'].allowPrivateIPAddress = true;
  localJson.services.CoAuthoring['request-filtering-agent'].allowMetaIPAddress = true;
  
  fs.writeFileSync('C:\\CoreResearch-Official\\CoreResearch\\poc\\onlyoffice\\patch.json', JSON.stringify(localJson, null, 2));
  
  execSync('docker cp C:\\CoreResearch-Official\\CoreResearch\\poc\\onlyoffice\\patch.json bccb89516b9f:/etc/onlyoffice/documentserver/local.json');
  execSync('docker exec bccb89516b9f supervisorctl restart all');
  console.log('Successfully patched ONLYOFFICE local.json');
} catch (e) {
  console.error(e);
}
