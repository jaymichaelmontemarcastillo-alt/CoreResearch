const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/adviser-research/me',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer dev-token-dev-user-id-admin',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('GET /api/adviser-research/me =>', res.statusCode, data);
  });
});
req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();

const req2 = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/repository/publish',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer dev-token-dev-user-id-admin',
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('POST /api/repository/publish =>', res.statusCode, data);
  });
});
req2.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req2.write(JSON.stringify({
  title: 'Test',
  abstract: 'Test abstract',
  pdfUrl: 'data:application/pdf;base64,abc'
}));
req2.end();
