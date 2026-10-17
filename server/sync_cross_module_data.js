import admin from 'firebase-admin';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const findServiceAccount = () => {
  const dirs = [process.cwd(), path.resolve(process.cwd(), '..')];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (f === 'serviceAccountKey.json' || (f.includes('firebase-adminsdk') && f.endsWith('.json'))) {
        return path.resolve(d, f);
      }
    }
  }
  return null;
};

admin.initializeApp({ credential: admin.credential.cert(findServiceAccount()) });
const db = admin.firestore();

// Standard schedule definitions for the 8 groups
const scheduleTimes = [
  { groupNum: 1, startTime: '08:30', endTime: '09:30', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 2, startTime: '09:31', endTime: '10:30', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 3, startTime: '10:31', endTime: '11:30', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 4, startTime: '11:30', endTime: '12:30', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 5, startTime: '13:00', endTime: '14:00', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 6, startTime: '14:00', endTime: '15:00', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 7, startTime: '15:00', endTime: '16:00', date: '2026-10-27', venue: 'CCS Defense Hall A' },
  { groupNum: 8, startTime: '16:00', endTime: '17:00', date: '2026-10-27', venue: 'CCS Defense Hall A' },
];

async function syncAll() {
  console.log('=== Starting Cross-Module Data Synchronization ===');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const MongoUser = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ uid: String }, { strict: false }));
  const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', new mongoose.Schema({ id: String }, { strict: false }));
  const MongoSchedule = mongoose.models.Schedule || mongoose.model('Schedule', new mongoose.Schema({ id: String }, { strict: false }));

  // 1. Sync Courses & Sections in Firestore
  console.log('\n--- 1. Normalizing Courses and Sections ---');
  await db.collection('courses').doc('bscs').set({
    id: 'bscs',
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    departmentId: 'cs',
    active: true,
    specializations: [{ id: 'is', code: 'IS', name: 'Intelligent Systems' }],
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log('Normalized course: bscs');

  const bscsSectionAId = 'j7NgIjBNqAJSb25eQ2KR';
  const bscsSectionBId = '9qIdsR7ae0e2SygGN4hE';

  await db.collection('sections').doc(bscsSectionAId).set({
    id: bscsSectionAId,
    name: 'A',
    courseId: 'bscs',
    specializationId: 'is',
    active: true,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`Normalized section: Section A (${bscsSectionAId})`);

  await db.collection('sections').doc(bscsSectionBId).set({
    id: bscsSectionBId,
    name: 'B',
    courseId: 'bscs',
    specializationId: 'is',
    active: true,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  console.log(`Normalized section: Section B (${bscsSectionBId})`);

  // 2. Fetch all BSCS Section A groups
  console.log('\n--- 2. Updating Research Groups to Canonical Section ID ---');
  const groupSnap = await db.collection('research_groups').where('courseId', '==', 'bscs').get();
  console.log(`Found ${groupSnap.size} BSCS groups in Firestore.`);

  let index = 1;
  for (const docSnap of groupSnap.docs) {
    const g = docSnap.data();
    // Only target Group 01 - Group 08
    if (g.name && g.name.startsWith('Group 0')) {
      const gNum = parseInt(g.name.replace('Group 0', ''), 10);
      const schedInfo = scheduleTimes.find(s => s.groupNum === gNum);

      const groupUpdates = {
        sectionId: bscsSectionAId,
        sectionName: 'A',
        specializationId: 'is',
        specialization: 'IS',
        courseId: 'bscs',
        courseName: 'Bachelor of Science in Computer Science',
        status: 'ready',
        updatedAt: new Date().toISOString()
      };

      await db.collection('research_groups').doc(docSnap.id).update(groupUpdates);
      await MongoGroup.findOneAndUpdate({ id: docSnap.id }, groupUpdates, { upsert: true });

      // Update student user profiles
      if (Array.isArray(g.memberIds)) {
        for (const uid of g.memberIds) {
          const userUpdates = {
            sectionId: bscsSectionAId,
            sectionName: 'A',
            specializationId: 'is',
            specialization: 'IS',
            programSpecialization: 'IS',
            courseId: 'bscs',
            program: 'Bachelor of Science in Computer Science',
            groupId: docSnap.id,
            groupName: g.name,
            researchTitle: g.title || '',
            adviserId: g.adviserId || '',
            adviserName: g.adviserName || '',
            updated_at: new Date().toISOString()
          };
          await db.collection('users').doc(uid).set(userUpdates, { merge: true });
          await MongoUser.findOneAndUpdate({ uid }, userUpdates);
        }
      }

      // Update proposal document with sectionId
      const propSnap = await db.collection('proposals').where('groupId', '==', docSnap.id).get();
      if (!propSnap.empty) {
        for (const pDoc of propSnap.docs) {
          await db.collection('proposals').doc(pDoc.id).update({
            sectionId: bscsSectionAId,
            sectionName: 'A',
            specializationId: 'is',
            status: 'approved',
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 3. Provision Manuscript Workspace
      console.log(`Synchronizing workspace for ${g.name}...`);
      const wsId = `ws-${docSnap.id}`;
      const wsDoc = {
        id: wsId,
        groupId: docSnap.id,
        groupName: g.name,
        projectId: docSnap.id,
        title: g.title,
        adviserId: g.adviserId || '',
        adviserName: g.adviserName || '',
        courseId: 'bscs',
        courseName: 'Bachelor of Science in Computer Science',
        sectionId: bscsSectionAId,
        sectionName: 'A',
        memberIds: g.memberIds || [],
        members: g.members || [],
        studentId: g.memberIds?.[0] || '',
        studentName: g.members?.[0]?.fullName || '',
        status: 'active',
        isArchived: false,
        sections: [
          { id: 'sec-intro', title: 'Chapter 1: Introduction', status: 'draft', content: '' },
          { id: 'sec-lit', title: 'Chapter 2: Literature Review', status: 'draft', content: '' },
          { id: 'sec-method', title: 'Chapter 3: Methodology', status: 'draft', content: '' },
          { id: 'sec-results', title: 'Chapter 4: Results & Discussion', status: 'draft', content: '' },
          { id: 'sec-concl', title: 'Chapter 5: Conclusion & Recommendations', status: 'draft', content: '' },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await db.collection('manuscript_workspaces').doc(wsId).set(wsDoc, { merge: true });

      // 4. Provision Accepted Adviser Request
      if (g.adviserId) {
        const reqSnap = await db.collection('adviser_requests').where('groupId', '==', docSnap.id).get();
        let reqId;
        if (!reqSnap.empty) {
          reqId = reqSnap.docs[0].id;
        } else {
          reqId = db.collection('adviser_requests').doc().id;
        }

        const adviserReqDoc = {
          id: reqId,
          studentId: g.memberIds?.[0] || '',
          studentName: g.members?.[0]?.fullName || '',
          groupId: docSnap.id,
          groupName: g.name,
          courseId: 'bscs',
          courseName: 'Bachelor of Science in Computer Science',
          sectionId: bscsSectionAId,
          sectionName: 'A',
          researchTitle: g.title,
          researchDescription: `Intelligent Systems capstone research for ${g.name}.`,
          adviserId: g.adviserId,
          adviserName: g.adviserName,
          compatibilityScore: 95,
          status: 'accepted',
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.collection('adviser_requests').doc(reqId).set(adviserReqDoc, { merge: true });
      }

      // 5. Provision Defense Schedule in MongoDB & Firestore
      if (schedInfo) {
        console.log(`Scheduling defense presentation for ${g.name} (${schedInfo.startTime} - ${schedInfo.endTime})...`);
        const schedId = `sch-cs-${gNum.toString().padStart(2, '0')}`;
        const panelistIds = (g.panelists || []).map(p => p.id || p.uid).filter(Boolean);
        const panelistNames = (g.panelists || []).map(p => p.name).filter(Boolean);

        const scheduleRecord = {
          id: schedId,
          projectId: docSnap.id,
          groupId: docSnap.id,
          projectTitle: g.title,
          studentName: g.members?.[0]?.fullName || 'Student Researcher',
          defenseType: 'proposal_defense',
          defenseStage: 'Title Defense',
          date: schedInfo.date,
          startTime: schedInfo.startTime,
          endTime: schedInfo.endTime,
          time: schedInfo.startTime,
          venue: schedInfo.venue,
          location: schedInfo.venue,
          courseId: 'bscs',
          sectionId: bscsSectionAId,
          sectionName: 'A',
          panelistIds,
          panelistNames,
          panelists: g.panelists || [],
          adviserId: g.adviserId || '',
          adviserName: g.adviserName || '',
          memberIds: g.memberIds || [],
          members: g.members || [],
          status: 'scheduled',
          attempt: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Write to MongoDB schedules
        await MongoSchedule.findOneAndUpdate({ id: schedId }, scheduleRecord, { upsert: true, returnDocument: 'after' });
        // Write to Firestore 'schedules'
        await db.collection('schedules').doc(schedId).set(scheduleRecord, { merge: true });
        // Write to Firestore 'defense_schedules'
        await db.collection('defense_schedules').doc(schedId).set(scheduleRecord, { merge: true });
      }

      console.log(`Completed sync for ${g.name}`);
    }
  }

  console.log('\n=== Cross-Module Data Synchronization Completed Successfully! ===');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('Fatal error in syncAll:', err);
  process.exit(1);
});
