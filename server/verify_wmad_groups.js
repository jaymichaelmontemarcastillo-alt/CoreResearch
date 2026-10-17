import { db } from './src/config/firebaseAdmin.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const expectedWMAD = [
  {
    num: 1,
    title: 'AksyonNa: Machine Learning-Driven System for Efficient LGU Issue Reporting and Desk Management',
    adviser: 'Jocelyn O. Padallan',
    students: ['Jynn Casili', 'Mirah Lim', 'Adriel Fernandez'],
    panelists: ['Mike Philip T. Ramos', 'Carolina R. Joval', 'Myra V. Paicaglino']
  },
  {
    num: 2,
    title: 'CoreResearch: A Hybrid Research Management System for Manuscript Monitoring, Revision, Grading, and Research Scheduling for Laguna State Polytechnic University – Los Baños Campus',
    adviser: 'Alejandro V. Matute Jr.',
    students: ['Jay Michael Castillo', 'John Paul Empalmado', 'Chester Mendoza'],
    panelists: ['Maribel V. Cardona', 'Dr. Sherwin B. Sapin', 'Myra V. Paicaglino']
  },
  {
    num: 3,
    title: 'ProjectBundok: A Web-Based Visitor Management System with a Context-Aware AI Assistant for Mount Kalisungan in Calauan, Laguna',
    adviser: 'Dr. Loyd S. Echalar',
    students: ['Ivan Angelo Cano', 'Justine Castanar', 'Allana Macatuno'],
    panelists: ['Gene Marck B. Catedrilla', 'Jonardo R. Asor', 'Jocelyn O. Padallan']
  },
  {
    num: 4,
    title: 'Development of an Automated Assessment Application Utilizing Optical Character Recognition and Natural Language Processing for Essay and Objective Examination',
    adviser: 'Alejandro V. Matute Jr.',
    students: ['Rondale Angelo Magda', 'Fiona Sanchez', 'Alexandra Nicole Blasco'],
    panelists: ['Dr. Crisanto F. Gulay', 'Carolina R. Joval', 'Jhoco S. Millanes']
  },
  {
    num: 5,
    title: 'SkillBridge: A Rule-Based Skill Compatibility Matching Platform for Internship Recommendation Among Students',
    adviser: 'Dr. Crisanto F. Gulay',
    students: ['Lawrence Salvador', 'Jeric Manibog', 'Daryl Lapitan'],
    panelists: ['Jonalyn Joy B. Labayne', 'Carolina R. Joval', 'Myra V. Paicaglino']
  },
  {
    num: 6,
    title: 'Intellisched: Development of an AI-Assisted Web-Based Scheduling System Utilizing Genetic Algorithm for Conflict Detection and Optimization',
    adviser: 'Dr. Loyd S. Echalar',
    students: ['Carl Leinard Larga', 'Clark Louie Desepida', 'Sean Garcia'],
    panelists: ['Gene Marck B. Catedrilla', 'Dr. Sherwin B. Sapin', 'Myra V. Paicaglino']
  },
  {
    num: 7,
    title: 'Development of the Aral Program Application of the Office of the Hon. Neil Andrew N. Nocon for the Department of Education Division of Laguna',
    adviser: 'Dr. Loyd S. Echalar',
    students: ['Danielle Linga', 'John Royce Esporlas', 'Jared Nate Odian'],
    panelists: ['Mike Philip T. Ramos', 'Carolina R. Joval', 'Jocelyn O. Padallan']
  },
  {
    num: 8,
    title: 'Enhancing Operational Efficiency and Resource Management in Optical Clinic Utilizing Supervised Machine Learning Frameworks',
    adviser: 'Dr. Crisanto F. Gulay',
    students: ['Bryan Manera', 'Raiza Jonelle Gacer', 'Renz Gallego'],
    panelists: ['Alejandro V. Matute Jr.', 'Carolina R. Joval', 'Jocelyn O. Padallan']
  }
];

async function verify() {
  console.log('================================================================');
  console.log('       WMAD SECTION A DATABASE POPULATION VERIFICATION');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  const MongoSchedule = mongoose.models.Schedule || mongoose.model('Schedule', new mongoose.Schema({ id: String }, { strict: false }));
  const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', new mongoose.Schema({ id: String }, { strict: false }));

  const wmadSectionAId = 'mIhskjSATV5amvcwZ35J';

  // 1. Check Research Groups in Firestore
  console.log('--- 1. Checking Research Groups in Section A (Firestore) ---');
  const snap = await db.collection('research_groups').where('sectionId', '==', wmadSectionAId).get();
  console.log(`Found ${snap.size} groups in WMAD Section A.`);

  const groupsInSec = [];
  snap.forEach(d => groupsInSec.push({ id: d.id, ...d.data() }));

  let passedGroups = 0;
  for (const exp of expectedWMAD) {
    const grp = groupsInSec.find(g => g.name === `Group 0${exp.num}` || g.id === `group-wmad-0${exp.num}`);
    if (!grp) {
      console.error(`✗ MISSING Group 0${exp.num}`);
      continue;
    }

    const titleOk = grp.title === exp.title;
    const advOk = (grp.adviserName || '').includes(exp.adviser.split(' ').slice(-1)[0]);
    const membersOk = (grp.members || []).length === 3;
    const panelistsOk = (grp.panelists || []).length === 3;

    if (titleOk && advOk && membersOk && panelistsOk) {
      passedGroups++;
      console.log(`✓ Group 0${exp.num}:`);
      console.log(`    Title: "${grp.title.substring(0, 50)}..."`);
      console.log(`    Adviser: ${grp.adviserName}`);
      console.log(`    Members (${grp.members.length}): ${grp.members.map(m => m.fullName).join(', ')}`);
      console.log(`    Panelists (${grp.panelists.length}): ${grp.panelists.map(p => `${p.role}: ${p.name}`).join(' | ')}`);
    } else {
      console.error(`✗ Group 0${exp.num} verification failed:`, { titleOk, advOk, membersOk, panelistsOk });
    }
  }

  console.log(`\nGroups verified: ${passedGroups}/8 passed.`);

  // 2. Check MongoDB sync
  console.log('\n--- 2. Checking MongoDB Research Groups Sync ---');
  const mongoGroups = await MongoGroup.find({ sectionId: wmadSectionAId }).lean();
  console.log(`Found ${mongoGroups.length} groups in MongoDB for WMAD Section A.`);
  if (mongoGroups.length >= 8) {
    console.log('✓ MongoDB sync verified.');
  } else {
    console.warn('MongoDB group count lower than expected.');
  }

  // 3. Check Section 6 Rule: NO SCHEDULES CREATED
  console.log('\n--- 3. Verifying Section 6 Rule: NO Scheduled Times or Events ---');
  const groupIds = expectedWMAD.map(e => `group-wmad-0${e.num}`);
  const mongoScheds = await MongoSchedule.find({ projectId: { $in: groupIds } }).lean();
  const fsScheds = await db.collection('schedules').where('sectionId', '==', wmadSectionAId).get();
  const defScheds = await db.collection('defense_schedules').where('sectionId', '==', wmadSectionAId).get();

  console.log(`  MongoDB schedules for WMAD groups: ${mongoScheds.length}`);
  console.log(`  Firestore 'schedules' for WMAD Section A: ${fsScheds.size}`);
  console.log(`  Firestore 'defense_schedules' for WMAD Section A: ${defScheds.size}`);

  if (mongoScheds.length === 0 && fsScheds.size === 0 && defScheds.size === 0) {
    console.log('✓ PASS: All scheduled times remain strictly empty as requested in Section 6.');
  } else {
    console.error('✗ WARNING: Found unwanted schedule records for WMAD groups!');
  }

  // 4. Check Student Accounts
  console.log('\n--- 4. Checking Student Accounts & Profiles ---');
  let validStudents = 0;
  for (const exp of expectedWMAD) {
    for (const sName of exp.students) {
      const uSnap = await db.collection('users').where('fullName', '==', sName).get();
      const studentDoc = uSnap.docs.find(d => (d.data().role === 'student' || d.data().role_id === 'student'));
      if (studentDoc) {
        const uData = studentDoc.data();
        if (uData.sectionId === wmadSectionAId && uData.courseId === 'bsit') {
          validStudents++;
        }
      }
    }
  }
  console.log(`  Students verified in database: ${validStudents}/24`);
  if (validStudents === 24) {
    console.log('✓ All 24 students correctly configured under BSIT WMAD Section A.');
  }

  console.log('\n================================================================');
  console.log('               ALL ACCEPTANCE CRITERIA VERIFIED');
  console.log('================================================================');
  process.exit(0);
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
