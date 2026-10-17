import { auth, db } from './src/config/firebaseAdmin.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const wmadGroupsData = [
  {
    groupNumber: 1,
    name: 'Group 01',
    id: 'group-wmad-01',
    title: 'AksyonNa: Machine Learning-Driven System for Efficient LGU Issue Reporting and Desk Management',
    adviser: { name: 'Jocelyn O. Padallan', uid: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33' },
    panelists: [
      { name: 'Mike Philip T. Ramos', id: '79h7GjlDcYgpc4P7UlyFVBDWvXF2', role: 'Subject Specialist' },
      { name: 'Carolina R. Joval', id: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2', role: 'Statistician' },
      { name: 'Myra V. Paicaglino', id: 'Ln22hthmGKSMGaHIdrRjnZI1w452', role: 'Technical' }
    ],
    students: [
      { fullName: 'Jynn Casili', email: 'jynn.casili@student.lspu.edu.ph', studentNumber: '0424-2001' },
      { fullName: 'Mirah Lim', email: 'mirah.lim@student.lspu.edu.ph', studentNumber: '0424-2002' },
      { fullName: 'Adriel Fernandez', email: 'adriel.fernandez@student.lspu.edu.ph', studentNumber: '0424-2003' }
    ]
  },
  {
    groupNumber: 2,
    name: 'Group 02',
    id: 'group-wmad-02',
    title: 'CoreResearch: A Hybrid Research Management System for Manuscript Monitoring, Revision, Grading, and Research Scheduling for Laguna State Polytechnic University – Los Baños Campus',
    adviser: { name: 'Alejandro V. Matute Jr.', uid: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2' },
    panelists: [
      { name: 'Maribel V. Cardona', id: '2wKxrw778QVxsPg7lk8uJOmdAQx1', role: 'Subject Specialist' },
      { name: 'Dr. Sherwin B. Sapin', id: 'ZZGTg6gwaLZfTXoht4JnUYqV8Uh1', role: 'Statistician' },
      { name: 'Myra V. Paicaglino', id: 'Ln22hthmGKSMGaHIdrRjnZI1w452', role: 'Technical' }
    ],
    students: [
      { fullName: 'Jay Michael Castillo', email: 'jaymichaelcastillo@gmail.com', uid: '2PLYoucYenhgNjuv9bNFeonAVoQ2', studentNumber: '0423-4423' },
      { fullName: 'John Paul Empalmado', email: 'jpempalmado2005@gmail.com', uid: 'LBJyuqDVuSe9bQHdIRHIA3meNiB2', studentNumber: '0423-4199' },
      { fullName: 'Chester Mendoza', email: 'chesterm560@gmail.com', uid: 'Yx0KwZXdf0U4gOj5I0PssSgPda62', studentNumber: '0423-4560' }
    ]
  },
  {
    groupNumber: 3,
    name: 'Group 03',
    id: 'group-wmad-03',
    title: 'ProjectBundok: A Web-Based Visitor Management System with a Context-Aware AI Assistant for Mount Kalisungan in Calauan, Laguna',
    adviser: { name: 'Dr. Loyd S. Echalar', uid: 'K59LHpThtzVgVLuaSBMTTRpmuvC3' },
    panelists: [
      { name: 'Gene Marck B. Catedrilla', id: '6iSuoiMxDUMwR3Y5ncVRC2XAFyk1', role: 'Subject Specialist' },
      { name: 'Jonardo R. Asor', id: 'W4ncOxyN7zUynXqYigMalklG9kP2', role: 'Statistician' },
      { name: 'Jocelyn O. Padallan', id: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33', role: 'Technical' }
    ],
    students: [
      { fullName: 'Ivan Angelo Cano', email: 'ivanangelo.cano@student.lspu.edu.ph', studentNumber: '0424-2004' },
      { fullName: 'Justine Castanar', email: 'justine.castanar@student.lspu.edu.ph', studentNumber: '0424-2005' },
      { fullName: 'Allana Macatuno', email: 'allana.macatuno@student.lspu.edu.ph', studentNumber: '0424-2006' }
    ]
  },
  {
    groupNumber: 4,
    name: 'Group 04',
    id: 'group-wmad-04',
    title: 'Development of an Automated Assessment Application Utilizing Optical Character Recognition and Natural Language Processing for Essay and Objective Examination',
    adviser: { name: 'Alejandro V. Matute Jr.', uid: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2' },
    panelists: [
      { name: 'Dr. Crisanto F. Gulay', id: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682', role: 'Subject Specialist' },
      { name: 'Carolina R. Joval', id: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2', role: 'Statistician' },
      { name: 'Jhoco S. Millanes', id: '1VoJgdIs0CNeJKBfzBdjz6FGQkV2', role: 'Technical' }
    ],
    students: [
      { fullName: 'Rondale Angelo Magda', email: 'rondaleangelo.magda@student.lspu.edu.ph', studentNumber: '0424-2007' },
      { fullName: 'Fiona Sanchez', email: 'fiona.sanchez@student.lspu.edu.ph', studentNumber: '0424-2008' },
      { fullName: 'Alexandra Nicole Blasco', email: 'alexandranicole.blasco@student.lspu.edu.ph', studentNumber: '0424-2009' }
    ]
  },
  {
    groupNumber: 5,
    name: 'Group 05',
    id: 'group-wmad-05',
    title: 'SkillBridge: A Rule-Based Skill Compatibility Matching Platform for Internship Recommendation Among Students',
    adviser: { name: 'Dr. Crisanto F. Gulay', uid: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682' },
    panelists: [
      { name: 'Jonalyn Joy B. Labayne', id: 'N8U4UdylR8QX6p1CZu4aWFZfXFi2', role: 'Subject Specialist' },
      { name: 'Carolina R. Joval', id: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2', role: 'Statistician' },
      { name: 'Myra V. Paicaglino', id: 'Ln22hthmGKSMGaHIdrRjnZI1w452', role: 'Technical' }
    ],
    students: [
      { fullName: 'Lawrence Salvador', email: 'lawrence.salvador@student.lspu.edu.ph', studentNumber: '0424-2010' },
      { fullName: 'Jeric Manibog', email: 'jeric.manibog@student.lspu.edu.ph', studentNumber: '0424-2011' },
      { fullName: 'Daryl Lapitan', email: 'daryl.lapitan@student.lspu.edu.ph', studentNumber: '0424-2012' }
    ]
  },
  {
    groupNumber: 6,
    name: 'Group 06',
    id: 'group-wmad-06',
    title: 'Intellisched: Development of an AI-Assisted Web-Based Scheduling System Utilizing Genetic Algorithm for Conflict Detection and Optimization',
    adviser: { name: 'Dr. Loyd S. Echalar', uid: 'K59LHpThtzVgVLuaSBMTTRpmuvC3' },
    panelists: [
      { name: 'Gene Marck B. Catedrilla', id: '6iSuoiMxDUMwR3Y5ncVRC2XAFyk1', role: 'Subject Specialist' },
      { name: 'Dr. Sherwin B. Sapin', id: 'ZZGTg6gwaLZfTXoht4JnUYqV8Uh1', role: 'Statistician' },
      { name: 'Myra V. Paicaglino', id: 'Ln22hthmGKSMGaHIdrRjnZI1w452', role: 'Technical' }
    ],
    students: [
      { fullName: 'Carl Leinard Larga', email: 'carlleinard.larga@student.lspu.edu.ph', studentNumber: '0424-2013' },
      { fullName: 'Clark Louie Desepida', email: 'clarklouie.desepida@student.lspu.edu.ph', studentNumber: '0424-2014' },
      { fullName: 'Sean Garcia', email: 'sean.garcia@student.lspu.edu.ph', studentNumber: '0424-2015' }
    ]
  },
  {
    groupNumber: 7,
    name: 'Group 07',
    id: 'group-wmad-07',
    title: 'Development of the Aral Program Application of the Office of the Hon. Neil Andrew N. Nocon for the Department of Education Division of Laguna',
    adviser: { name: 'Dr. Loyd S. Echalar', uid: 'K59LHpThtzVgVLuaSBMTTRpmuvC3' },
    panelists: [
      { name: 'Mike Philip T. Ramos', id: '79h7GjlDcYgpc4P7UlyFVBDWvXF2', role: 'Subject Specialist' },
      { name: 'Carolina R. Joval', id: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2', role: 'Statistician' },
      { name: 'Jocelyn O. Padallan', id: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33', role: 'Technical' }
    ],
    students: [
      { fullName: 'Danielle Linga', email: 'danielle.linga@student.lspu.edu.ph', studentNumber: '0424-2016' },
      { fullName: 'John Royce Esporlas', email: 'johnroyce.esporlas@student.lspu.edu.ph', studentNumber: '0424-2017' },
      { fullName: 'Jared Nate Odian', email: 'jarednate.odian@student.lspu.edu.ph', studentNumber: '0424-2018' }
    ]
  },
  {
    groupNumber: 8,
    name: 'Group 08',
    id: 'group-wmad-08',
    title: 'Enhancing Operational Efficiency and Resource Management in Optical Clinic Utilizing Supervised Machine Learning Frameworks',
    adviser: { name: 'Dr. Crisanto F. Gulay', uid: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682' },
    panelists: [
      { name: 'Alejandro V. Matute Jr.', id: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2', role: 'Subject Specialist' },
      { name: 'Carolina R. Joval', id: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2', role: 'Statistician' },
      { name: 'Jocelyn O. Padallan', id: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33', role: 'Technical' }
    ],
    students: [
      { fullName: 'Bryan Manera', email: 'bryan.manera@student.lspu.edu.ph', studentNumber: '0424-2019' },
      { fullName: 'Raiza Jonelle Gacer', email: 'raizajonelle.gacer@student.lspu.edu.ph', studentNumber: '0424-2020' },
      { fullName: 'Renz Gallego', email: 'renz.gallego@student.lspu.edu.ph', studentNumber: '0424-2021' }
    ]
  }
];

async function provisionWMADGroups() {
  console.log('===========================================================');
  console.log('   PROVISIONING 8 WMAD SECTION A RESEARCH GROUPS');
  console.log('===========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const MongoUser = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ uid: String }, { strict: false }));
  const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', new mongoose.Schema({ id: String }, { strict: false }));

  const courseId = 'bsit';
  const courseName = 'Bachelor of Science in Information Technology';
  const programCode = 'BSIT';
  const specializationId = 'wmad';
  const specialization = 'WMAD';
  const sectionId = 'mIhskjSATV5amvcwZ35J'; // BSIT WMAD Section A canonical doc ID
  const sectionName = 'A';
  const academicYear = '2026-2027';
  const semester = '1st';
  const defaultPassword = 'Student2026_LSPU!';

  // Clean up old test group-coreresearch-01 if it has name 'Group 01'
  try {
    const oldSnap = await db.collection('research_groups').doc('group-coreresearch-01').get();
    if (oldSnap.exists) {
      console.log('Removing old test group-coreresearch-01 to avoid name collision with new Group 01...');
      await db.collection('research_groups').doc('group-coreresearch-01').delete();
      await MongoGroup.findOneAndDelete({ id: 'group-coreresearch-01' });
    }
  } catch (e) {
    console.warn('Note on old group cleanup:', e.message);
  }

  // 1. Process Students and Create Accounts if missing
  console.log('\n--- 1. Processing and Registering Student Accounts ---');
  const studentCredentials = [];

  for (const group of wmadGroupsData) {
    for (const student of group.students) {
      let uid = student.uid;
      let email = student.email.toLowerCase();

      // Check if user already exists in Firestore by email or uid
      let existingFsUser = null;
      if (uid) {
        const uDoc = await db.collection('users').doc(uid).get();
        if (uDoc.exists) existingFsUser = { id: uDoc.id, ...uDoc.data() };
      }
      if (!existingFsUser) {
        const qSnap = await db.collection('users').where('email', '==', email).get();
        if (!qSnap.empty) {
          existingFsUser = { id: qSnap.docs[0].id, ...qSnap.docs[0].data() };
          uid = existingFsUser.id;
        }
      }

      // Check Auth
      let authUser = null;
      try {
        authUser = await auth.getUserByEmail(email);
        uid = authUser.uid;
      } catch (e) {
        // Not in Auth yet
      }

      if (!authUser && !uid) {
        // Create in Firebase Auth
        try {
          authUser = await auth.createUser({
            email,
            password: defaultPassword,
            displayName: student.fullName,
          });
          uid = authUser.uid;
          studentCredentials.push({
            fullName: student.fullName,
            email,
            password: defaultPassword,
            uid
          });
          console.log(`Created Firebase Auth user: ${student.fullName} (${email}) -> UID: ${uid}`);
        } catch (authErr) {
          console.error(`Error creating Auth user for ${student.fullName}:`, authErr.message);
          uid = db.collection('users').doc().id;
        }
      } else {
        console.log(`Reusing existing student account: ${student.fullName} (${email}) -> UID: ${uid}`);
      }

      student.uid = uid;

      // Update student document in Firestore and MongoDB
      const nameParts = student.fullName.trim().split(' ');
      const first_name = nameParts[0];
      const last_name = nameParts.slice(1).join(' ');

      const userDoc = {
        uid,
        email,
        first_name,
        last_name,
        fullName: student.fullName,
        role: 'student',
        role_id: 'student',
        department: 'Computer Studies',
        department_id: 'Computer Studies',
        studentId: student.studentNumber,
        studentIdOrEmployeeId: student.studentNumber,
        courseId,
        program_id: courseId,
        program: courseName,
        programCode,
        specializationId,
        specialization,
        major: 'WMAD',
        majorCode: 'WMAD',
        programSpecialization: 'WMAD',
        sectionId,
        sectionName,
        section: sectionName,
        status: 'active',
        is_approved: true,
        groupId: group.id,
        groupName: group.name,
        researchTitle: group.title,
        adviserId: group.adviser.uid,
        adviserName: group.adviser.name,
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.collection('users').doc(uid).set(userDoc, { merge: true });
      await MongoUser.findOneAndUpdate({ uid }, userDoc, { upsert: true, new: true });
    }
  }

  // 2. Insert the 8 Research Groups & Connected Documents
  console.log('\n--- 2. Registering 8 WMAD Research Groups & Relationships ---');
  
  for (const group of wmadGroupsData) {
    const memberObjects = group.students.map(s => ({
      uid: s.uid,
      fullName: s.fullName,
      email: s.email,
      studentNumber: s.studentNumber
    }));
    const memberIds = group.students.map(s => s.uid);
    const leader = memberObjects[0];

    const groupDoc = {
      id: group.id,
      name: group.name,
      title: group.title,
      courseId,
      courseName,
      programCode,
      specializationId,
      specialization,
      sectionId,
      sectionName,
      academicYear,
      semester,
      status: 'ready',
      adviserId: group.adviser.uid,
      adviserName: group.adviser.name,
      panelists: group.panelists,
      panelistIds: group.panelists.map(p => p.id),
      panelistNames: group.panelists.map(p => p.name),
      members: memberObjects,
      memberIds: memberIds,
      leaderId: leader.uid,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firestore
    await db.collection('research_groups').doc(group.id).set(groupDoc, { merge: true });
    // Save to MongoDB
    await MongoGroup.findOneAndUpdate({ id: group.id }, groupDoc, { upsert: true, new: true });

    // 3. Proposal Record in Firestore
    const proposalId = `prop-${group.id}`;
    const proposalDoc = {
      id: proposalId,
      groupId: group.id,
      groupName: group.name,
      title: group.title,
      description: `WMAD Capstone Research for ${group.name}.`,
      courseId,
      courseName,
      specializationId,
      sectionId,
      sectionName,
      status: 'approved',
      submittedByUid: leader.uid,
      submittedByName: leader.fullName,
      adviserId: group.adviser.uid,
      adviserName: group.adviser.name,
      members: memberObjects,
      memberIds: memberIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('proposals').doc(proposalId).set(proposalDoc, { merge: true });

    // 4. Manuscript Workspace Record in Firestore
    const wsId = `ws-${group.id}`;
    const wsDoc = {
      id: wsId,
      groupId: group.id,
      groupName: group.name,
      projectId: group.id,
      title: group.title,
      courseId,
      courseName,
      specializationId,
      sectionId,
      sectionName,
      studentId: leader.uid,
      studentName: leader.fullName,
      adviserId: group.adviser.uid,
      adviserName: group.adviser.name,
      members: memberObjects,
      memberIds: memberIds,
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

    // 5. Accepted Adviser Request
    const reqId = `req-${group.id}`;
    const adviserReqDoc = {
      id: reqId,
      studentId: leader.uid,
      studentName: leader.fullName,
      groupId: group.id,
      groupName: group.name,
      courseId,
      courseName,
      sectionId,
      sectionName,
      researchTitle: group.title,
      researchDescription: `WMAD Capstone Research for ${group.name}.`,
      adviserId: group.adviser.uid,
      adviserName: group.adviser.name,
      compatibilityScore: 95,
      status: 'accepted',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('adviser_requests').doc(reqId).set(adviserReqDoc, { merge: true });

    console.log(`✓ Registered ${group.name} (${group.id})`);
    console.log(`    Title: "${group.title.substring(0, 55)}..."`);
    console.log(`    Adviser: ${group.adviser.name}`);
    console.log(`    Panelists: ${group.panelists.map(p => p.name).join(' | ')}`);
    console.log(`    Students: ${memberObjects.map(m => m.fullName).join(', ')}`);
  }

  // Save new student credentials if any were created
  if (studentCredentials.length > 0) {
    fs.writeFileSync(
      path.join(__dirname, 'wmad_student_credentials.json'),
      JSON.stringify(studentCredentials, null, 2)
    );
    console.log(`\nSaved ${studentCredentials.length} student credentials to wmad_student_credentials.json`);
  }

  console.log('\n===========================================================');
  console.log('   WMAD SECTION A GROUPS PROVISIONED SUCCESSFULLY!');
  console.log('   (Note: Sched times left empty per Section 6 rule)');
  console.log('===========================================================');
  process.exit(0);
}

provisionWMADGroups().catch(err => {
  console.error('Fatal error provisioning WMAD groups:', err);
  process.exit(1);
});
