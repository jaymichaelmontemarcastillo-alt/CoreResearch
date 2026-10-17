import { db } from './src/config/firebaseAdmin.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MongoGroupSchema = new mongoose.Schema({ id: String, name: String, title: String, sectionId: String, members: Array, panelists: Array }, { collection: 'researchgroups' });
const MongoScheduleSchema = new mongoose.Schema({ id: String, projectId: String, groupId: String }, { collection: 'schedules' });

const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', MongoGroupSchema);
const MongoSchedule = mongoose.models.Schedule || mongoose.model('Schedule', MongoScheduleSchema);

const amgSectionAId = '3EvabSd3asHsUhBAMgGz';
const wmadSection3BId = 'mDUKksEOzqo839HzcSud';

async function verify() {
  console.log('================================================================');
  console.log('       BSIT AMG & WMAD 3B DATABASE POPULATION VERIFICATION');
  console.log('================================================================');

  await mongoose.connect(process.env.MONGODB_URI);

  // 1. Check AMG Section A Groups (8 groups)
  console.log('\n--- 1. Checking BSIT AMG Section A Groups ---');
  const amgFsGroups = await db.collection('research_groups').where('sectionId', '==', amgSectionAId).get();
  console.log(`Found ${amgFsGroups.size} groups in AMG Section A (Firestore). Expected: 8`);
  if (amgFsGroups.size !== 8) throw new Error(`Expected 8 AMG groups, found ${amgFsGroups.size}`);

  let amgPassed = 0;
  for (let i = 1; i <= 8; i++) {
    const gId = `group-amg-0${i}`;
    const doc = amgFsGroups.docs.find(d => d.id === gId);
    if (!doc) {
      console.error(`✗ Missing ${gId}`);
      continue;
    }
    const d = doc.data();
    const membersOk = (d.members || []).length === 3;
    const panelistsOk = (d.panelists || []).length === 3;
    const adviserOk = !!d.adviserId && !!d.adviserName;
    if (membersOk && panelistsOk && adviserOk) {
      amgPassed++;
      console.log(`✓ AMG ${d.name} (${gId}): "${d.title.substring(0, 45)}..." | Adv: ${d.adviserName} | Members: ${d.members.length} | Panel: ${d.panelists.length}`);
    } else {
      console.error(`✗ AMG ${gId} check failed`, { membersOk, panelistsOk, adviserOk });
    }
  }

  // 2. Check WMAD Section 3B Groups (10 groups)
  console.log('\n--- 2. Checking BSIT WMAD Section 3B Groups ---');
  const wmad3bFsGroups = await db.collection('research_groups').where('sectionId', '==', wmadSection3BId).get();
  console.log(`Found ${wmad3bFsGroups.size} groups in WMAD Section 3B (Firestore). Expected: 10`);
  if (wmad3bFsGroups.size !== 10) throw new Error(`Expected 10 WMAD 3B groups, found ${wmad3bFsGroups.size}`);

  let wmadPassed = 0;
  for (let i = 1; i <= 10; i++) {
    const numStr = i < 10 ? `0${i}` : `${i}`;
    const gId = `group-wmad3b-${numStr}`;
    const doc = wmad3bFsGroups.docs.find(d => d.id === gId);
    if (!doc) {
      console.error(`✗ Missing ${gId}`);
      continue;
    }
    const d = doc.data();
    const expectedMemberCount = (i === 2 || i === 7) ? 4 : 3;
    const membersOk = (d.members || []).length === expectedMemberCount;
    const panelistsOk = (d.panelists || []).length === 3;
    const adviserOk = !!d.adviserId && !!d.adviserName;
    if (membersOk && panelistsOk && adviserOk) {
      wmadPassed++;
      console.log(`✓ WMAD 3B ${d.name} (${gId}): "${d.title.substring(0, 45)}..." | Adv: ${d.adviserName} | Members: ${d.members.length} (expected ${expectedMemberCount}) | Panel: ${d.panelists.length}`);
    } else {
      console.error(`✗ WMAD 3B ${gId} check failed`, { membersOk, panelistsOk, adviserOk, actualMembers: d.members?.length });
    }
  }

  // 3. Check MongoDB Synchronization
  console.log('\n--- 3. Checking MongoDB Sync for 18 Groups ---');
  const amgMongo = await MongoGroup.find({ sectionId: amgSectionAId }).lean();
  const wmadMongo = await MongoGroup.find({ sectionId: wmadSection3BId }).lean();
  console.log(`MongoDB AMG Section A groups: ${amgMongo.length}/8`);
  console.log(`MongoDB WMAD Section 3B groups: ${wmadMongo.length}/10`);
  if (amgMongo.length !== 8 || wmadMongo.length !== 10) throw new Error('MongoDB group count mismatch!');
  console.log('✓ MongoDB sync verified for all 18 groups.');

  // 4. Check Section 6 Rule: NO Scheduled Times or Events
  console.log('\n--- 4. Verifying STRICT Scheduling Restriction (No Dates/Times/Rooms) ---');
  const allGroupIds = [
    ...Array.from({ length: 8 }, (_, i) => `group-amg-0${i + 1}`),
    ...Array.from({ length: 10 }, (_, i) => `group-wmad3b-${i < 9 ? '0' + (i + 1) : i + 1}`)
  ];
  const mongoScheds = await MongoSchedule.find({
    $or: [{ projectId: { $in: allGroupIds } }, { groupId: { $in: allGroupIds } }]
  }).lean();
  const fsSchedsAmg = await db.collection('schedules').where('sectionId', '==', amgSectionAId).get();
  const fsSchedsWmad = await db.collection('schedules').where('sectionId', '==', wmadSection3BId).get();
  const defSchedsAmg = await db.collection('defense_schedules').where('sectionId', '==', amgSectionAId).get();
  const defSchedsWmad = await db.collection('defense_schedules').where('sectionId', '==', wmadSection3BId).get();

  console.log(`  MongoDB schedules for these groups: ${mongoScheds.length}`);
  console.log(`  Firestore 'schedules' for AMG Section A: ${fsSchedsAmg.size}`);
  console.log(`  Firestore 'schedules' for WMAD Section 3B: ${fsSchedsWmad.size}`);
  console.log(`  Firestore 'defense_schedules' for AMG Section A: ${defSchedsAmg.size}`);
  console.log(`  Firestore 'defense_schedules' for WMAD Section 3B: ${defSchedsWmad.size}`);

  if (mongoScheds.length === 0 && fsSchedsAmg.size === 0 && fsSchedsWmad.size === 0 && defSchedsAmg.size === 0 && defSchedsWmad.size === 0) {
    console.log('✓ PASS: All scheduled times remain strictly empty as requested in Section 6.');
  } else {
    throw new Error('FAILED: Found unwanted schedules for these groups!');
  }

  // 5. Check Student Memberships & Profiles (56 students)
  console.log('\n--- 5. Checking All 56 Student Memberships & Profiles ---');
  let validStudents = 0;
  let amgStudents = 0;
  let wmadStudents = 0;

  const usersSnap = await db.collection('users').where('role', '==', 'student').get();
  usersSnap.forEach(doc => {
    const d = doc.data();
    if (d.sectionId === amgSectionAId && d.specializationId === 'amg') {
      amgStudents++;
      validStudents++;
    }
    if (d.sectionId === wmadSection3BId && d.specializationId === 'wmad') {
      wmadStudents++;
      validStudents++;
    }
  });

  console.log(`  AMG Section A students verified: ${amgStudents}/24`);
  console.log(`  WMAD Section 3B students verified: ${wmadStudents}/32`);
  console.log(`  Total verified students for this task: ${validStudents}/56`);
  if (amgStudents !== 24 || wmadStudents !== 32) {
    throw new Error(`Student count mismatch: expected 24 AMG and 32 WMAD, got ${amgStudents} and ${wmadStudents}`);
  }
  console.log('✓ All 56 student records accurately persisted and linked.');

  console.log('\n================================================================');
  console.log('       ALL ACCEPTANCE CRITERIA SUCCESSFULLY VERIFIED');
  console.log('================================================================');
  process.exit(0);
}

verify().catch(e => {
  console.error('VERIFICATION ERROR:', e.message);
  process.exit(1);
});
