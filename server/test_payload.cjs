async function test() {
  try {
    const largeString = 'a'.repeat(20 * 1024 * 1024); // 20MB
    const res = await fetch('http://localhost:5000/api/repository/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer dev-token-dev-user-id-admin'
      },
      body: JSON.stringify({
        title: 'Large Payload',
        abstract: 'Test',
        pdfUrl: `data:application/pdf;base64,${largeString}`
      })
    });
    console.log(res.status);
    const json = await res.json();
    console.log(json);
  } catch (err) {
    console.log(err.message);
  }
}
test();
