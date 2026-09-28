const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkTasks() {
  const snapshot = await db.collection('research_tasks').orderBy('createdAt', 'desc').limit(5).get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Task: ${data.title}`);
    console.log(`createdBy: ${data.createdBy}`);
    console.log(`createdByName: ${data.createdByName}`);
    console.log(`createdByRole: ${data.createdByRole}`);
    console.log('---');
  });
  process.exit(0);
}

checkTasks();
