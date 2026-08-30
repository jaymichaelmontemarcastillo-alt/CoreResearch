const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixGroups() {
  console.log('Fetching accepted adviser requests...');
  const requestsSnap = await db.collection('adviser_requests').where('status', '==', 'accepted').get();
  
  if (requestsSnap.empty) {
    console.log('No accepted requests found.');
    return;
  }

  console.log(`Found ${requestsSnap.size} accepted requests.`);
  let count = 0;

  for (const doc of requestsSnap.docs) {
    const data = doc.data();
    console.log(`Request ID: ${doc.id}, Student: ${data.studentName}, GroupID: ${data.groupId}, AdviserID: ${data.adviserId}`);
    
    let targetGroupId = data.groupId;

    if (!targetGroupId && data.studentId) {
      console.log(`Student ${data.studentName} has no group in request. Searching if they are in a group...`);
      const groupSnap = await db.collection('research_groups')
        .where('memberIds', 'array-contains', data.studentId)
        .get();
      
      if (!groupSnap.empty) {
        targetGroupId = groupSnap.docs[0].id;
        console.log(`Found group ${targetGroupId} for student ${data.studentName}.`);
        
        // Update the request with the found groupId
        await db.collection('adviser_requests').doc(doc.id).update({
          groupId: targetGroupId
        });
      } else {
        console.log(`No group found for student ${data.studentName}. Creating a new group for them...`);
        // Auto-create a single-member group
        const newGroupRef = db.collection('research_groups').doc();
        const now = new Date().toISOString();
        const newGroup = {
          id: newGroupRef.id,
          name: `Group for ${data.studentName}`,
          memberIds: [data.studentId],
          members: [{ uid: data.studentId, fullName: data.studentName }],
          status: 'incomplete',
          courseId: data.courseId || '',
          courseName: data.courseName || '',
          sectionId: data.sectionId || '',
          sectionName: data.sectionName || '',
          adviserId: data.adviserId,
          adviserName: data.adviserName || '',
          createdAt: now,
          updatedAt: now,
        };
        await newGroupRef.set(newGroup);
        targetGroupId = newGroupRef.id;
        
        await db.collection('adviser_requests').doc(doc.id).update({
          groupId: targetGroupId
        });
        console.log(`Created group ${targetGroupId} for student ${data.studentName}`);
        count++;
        continue;
      }
    }

    if (targetGroupId && data.adviserId) {
      console.log(`Checking group ${targetGroupId}...`);
      const groupRef = db.collection('research_groups').doc(targetGroupId);
      const groupSnap = await groupRef.get();
      
      if (groupSnap.exists) {
        const groupData = groupSnap.data();
        if (groupData.adviserId !== data.adviserId) {
          console.log(`Updating group ${targetGroupId} with adviser ${data.adviserId}`);
          await groupRef.update({
            adviserId: data.adviserId,
            adviserName: data.adviserName || groupData.adviserName || '',
            updatedAt: new Date().toISOString()
          });
          count++;
        } else {
          console.log(`Group ${targetGroupId} already has adviser ${data.adviserId}`);
        }
      }
    }
  }

  console.log(`Finished fixing groups. Updated ${count} groups.`);
}

fixGroups().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
