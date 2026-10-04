const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Usage: node migrateAnalytics.cjs [--execute]
const isDryRun = !process.argv.includes('--execute');

const serviceAccountPath = path.join(__dirname, '..', '..', '..', 'firebase-admin-key.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`Service account key not found at ${serviceAccountPath}`);
  console.error('Please ensure the firebase-admin-key.json exists in the root directory or use default credentials.');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function getAcademicYearFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 7 = Aug
  if (month >= 7) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

function getSemesterFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const month = d.getMonth();
  if (month >= 7 && month <= 11) return '1st';
  if (month >= 0 && month <= 4) return '2nd';
  return 'summer';
}

async function migrateData() {
  console.log(`Starting migration... Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('To write changes to the database, run with --execute');

  const stats = {
    workspaces: { updated: 0, skipped: 0, missingDate: 0, missingGroupOrCourse: 0 },
    proposals: { updated: 0, skipped: 0, missingDate: 0 },
    groups: { updated: 0, skipped: 0, missingDate: 0 },
    students: { updated: 0, skipped: 0, missingDate: 0 }
  };

  try {
    const workspacesRef = db.collection('manuscript_workspaces');
    const workspacesSnap = await workspacesRef.get();
    const groupsRef = db.collection('research_groups');
    const groupsSnap = await groupsRef.get();
    const groupsMap = new Map();
    groupsSnap.docs.forEach(doc => {
      groupsMap.set(doc.id, doc.data());
    });

    const batch = db.batch();
    let batchCount = 0;
    
    const commitBatch = async () => {
      if (batchCount > 0) {
        if (!isDryRun) await batch.commit();
        batchCount = 0;
      }
    };

    // 1. Workspaces
    for (const doc of workspacesSnap.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;

      const dateStr = data.createdAt || data.updatedAt;
      if (!dateStr) {
        stats.workspaces.missingDate++;
      } else {
        const expectedAY = getAcademicYearFromDate(dateStr);
        const expectedSem = getSemesterFromDate(dateStr);
        
        if (data.academicYear !== expectedAY || data.semester !== expectedSem) {
          updates.academicYear = expectedAY;
          updates.semester = expectedSem;
          needsUpdate = true;
        }
      }

      if (!data.courseId) {
        if (data.groupId) {
          const group = groupsMap.get(data.groupId);
          if (group && group.courseId) {
            updates.courseId = group.courseId;
            needsUpdate = true;
          } else {
            stats.workspaces.missingGroupOrCourse++;
          }
        } else {
          stats.workspaces.missingGroupOrCourse++;
        }
      }

      if (needsUpdate) {
        if (!isDryRun) batch.update(doc.ref, updates);
        stats.workspaces.updated++;
        batchCount++;
      } else {
        stats.workspaces.skipped++;
      }

      if (batchCount >= 400) await commitBatch();
    }
    await commitBatch();

    // 2. Proposals
    const proposalsRef = db.collection('proposals');
    const proposalsSnap = await proposalsRef.get();
    for (const doc of proposalsSnap.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;

      const dateStr = data.createdAt || data.submittedAt || data.updatedAt;
      if (!dateStr) {
        stats.proposals.missingDate++;
      } else {
        const expectedAY = getAcademicYearFromDate(dateStr);
        const expectedSem = getSemesterFromDate(dateStr);
        if (data.academicYear !== expectedAY || data.semester !== expectedSem) {
          updates.academicYear = expectedAY;
          updates.semester = expectedSem;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        if (!isDryRun) batch.update(doc.ref, updates);
        stats.proposals.updated++;
        batchCount++;
      } else {
        stats.proposals.skipped++;
      }

      if (batchCount >= 400) await commitBatch();
    }
    await commitBatch();

    // 3. Groups
    for (const doc of groupsSnap.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;

      const dateStr = data.createdAt || data.updatedAt;
      if (!dateStr) {
        stats.groups.missingDate++;
      } else {
        const expectedAY = getAcademicYearFromDate(dateStr);
        const expectedSem = getSemesterFromDate(dateStr);
        if (data.academicYear !== expectedAY || data.semester !== expectedSem) {
          updates.academicYear = expectedAY;
          updates.semester = expectedSem;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        if (!isDryRun) batch.update(doc.ref, updates);
        stats.groups.updated++;
        batchCount++;
      } else {
        stats.groups.skipped++;
      }

      if (batchCount >= 400) await commitBatch();
    }
    await commitBatch();

    // 4. Students
    const usersRef = db.collection('users');
    const usersSnap = await usersRef.where('role', '==', 'student').get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const updates = {};
      let needsUpdate = false;

      // Ensure fallback to current date if missing so users don't break
      const dateStr = data.created_at || new Date().toISOString();
      const expectedAY = getAcademicYearFromDate(dateStr);
      const expectedSem = getSemesterFromDate(dateStr);
      
      if (data.academicYear !== expectedAY || data.semester !== expectedSem) {
        updates.academicYear = expectedAY;
        updates.semester = expectedSem;
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (!isDryRun) batch.update(doc.ref, updates);
        stats.students.updated++;
        batchCount++;
      } else {
        stats.students.skipped++;
      }

      if (batchCount >= 400) await commitBatch();
    }
    await commitBatch();

    console.log('\nMigration Summary:');
    console.table(stats);
    if (isDryRun) {
      console.log('\nThis was a dry run. No data was actually modified.');
      console.log('Run with `node src/scripts/migrateAnalytics.cjs --execute` to apply changes.');
    } else {
      console.log('\nMigration committed successfully.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrateData().then(() => process.exit(0));
