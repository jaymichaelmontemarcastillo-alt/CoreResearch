import admin from 'firebase-admin';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const facultyList = [
  { fullName: 'Dr. Sherwin B. Sapin', firstName: 'Sherwin', lastName: 'Sapin', email: 'sherwin.sapin@lspu.edu.ph', password: 'Faculty2026_Sapin!' },
  { fullName: 'Jefferson L. Lerios', firstName: 'Jefferson', lastName: 'Lerios', email: 'jefferson.lerios@lspu.edu.ph', password: 'Faculty2026_Lerios!' },
  { fullName: 'Gene Marck B. Catedrilla', firstName: 'Gene Marck', lastName: 'Catedrilla', email: 'genemarck.catedrilla@lspu.edu.ph', password: 'Faculty2026_Catedrilla!' },
  { fullName: 'Jonardo R. Asor', firstName: 'Jonardo', lastName: 'Asor', email: 'jonardo.asor@lspu.edu.ph', password: 'Faculty2026_Asor!' },
  { fullName: 'Dr. Crisanto F. Gulay', firstName: 'Crisanto', lastName: 'Gulay', email: 'crisanto.gulay@lspu.edu.ph', password: 'Faculty2026_Gulay!' },
  { fullName: 'Alejandro V. Matute Jr.', firstName: 'Alejandro', lastName: 'Matute', email: 'alejandro.matute@lspu.edu.ph', password: 'Faculty2026_Matute!' },
  { fullName: 'Jocelyn O. Padallan', firstName: 'Jocelyn', lastName: 'Padallan', email: 'jocelyn.padallan@lspu.edu.ph', password: 'Faculty2026_Padallan!' },
  { fullName: 'Jonalyn Joy B. Labayne', firstName: 'Jonalyn Joy', lastName: 'Labayne', email: 'jonalynjoy.labayne@lspu.edu.ph', password: 'Faculty2026_Labayne!' },
  { fullName: 'Dr. Loyd S. Echalar', firstName: 'Loyd', lastName: 'Echalar', email: 'loyd.echalar@lspu.edu.ph', password: 'Faculty2026_Echalar!' },
  { fullName: 'Maribel V. Cardona', firstName: 'Maribel', lastName: 'Cardona', email: 'maribel.cardona@lspu.edu.ph', password: 'Faculty2026_Cardona!' },
  { fullName: 'Carolina R. Joval', firstName: 'Carolina', lastName: 'Joval', email: 'carolina.joval@lspu.edu.ph', password: 'Faculty2026_Joval!' },
  { fullName: 'Jhoco S. Millanes', firstName: 'Jhoco', lastName: 'Millanes', email: 'jhoco.millanes@lspu.edu.ph', password: 'Faculty2026_Millanes!' },
  { fullName: 'Maverick U. Moldez', firstName: 'Maverick', lastName: 'Moldez', email: 'maverick.moldez@lspu.edu.ph', password: 'Faculty2026_Moldez!' },
  { fullName: 'Myra V. Paicaglino', firstName: 'Myra', lastName: 'Paicaglino', email: 'myra.paicaglino@lspu.edu.ph', password: 'Faculty2026_Paicaglino!' },
  { fullName: 'Andres R. Vicedo', firstName: 'Andres', lastName: 'Vicedo', email: 'andres.vicedo@lspu.edu.ph', password: 'Faculty2026_Vicedo!' },
  { fullName: 'Mike Philip T. Ramos', firstName: 'Mike Philip', lastName: 'Ramos', email: 'mikephilip.ramos@lspu.edu.ph', password: 'Faculty2026_Ramos!' },
  { fullName: 'Wilson B. Suyat', firstName: 'Wilson', lastName: 'Suyat', email: 'wilson.suyat@lspu.edu.ph', password: 'Faculty2026_Suyat!' },
  { fullName: 'Morris V. Jebone', firstName: 'Morris', lastName: 'Jebone', email: 'morris.jebone@lspu.edu.ph', password: 'Faculty2026_Jebone!' },
];

const plannedGroups = [
  {
    groupNumber: 1,
    name: 'Group 01',
    studentEmails: ['aivan.mole@gmail.com', 'luigi.sanchez@gmail.com', 'micahella.mamaril@gmail.com'],
    title: 'Automated Early Plant Disease Detection and Classification Using Lightweight Deep Convolutional Neural Networks on Edge Devices',
    adviserName: 'Gene Marck B. Catedrilla',
    subjectSpecialist: 'Andres R. Vicedo',
    statistician: 'Carolina R. Joval',
    technical: 'Jhoco S. Millanes',
  },
  {
    groupNumber: 2,
    name: 'Group 02',
    studentEmails: ['andrewflores@gmail.com', 'hermie.a@gmail.com', 'kennethz.punta@gmail.com'],
    title: 'AI-Driven Automated Academic Manuscript Quality and Structural Integrity Assessment System Utilizing Natural Language Processing',
    adviserName: 'Dr. Sherwin B. Sapin',
    subjectSpecialist: 'Maribel V. Cardona',
    statistician: 'Jonardo R. Asor',
    technical: 'Myra V. Paicaglino',
  },
  {
    groupNumber: 3,
    name: 'Group 03',
    studentEmails: ['marianneangel@gmail.com', 'daniel.tejada@gmail.com', 'crislién.barayang@gmail.com'],
    title: 'Intelligent Multi-Modal Traffic Density Estimation and Dynamic Signal Control Using Real-Time Object Tracking',
    adviserName: 'Jefferson L. Lerios',
    subjectSpecialist: 'Maverick U. Moldez',
    statistician: 'Dr. Sherwin B. Sapin',
    technical: 'Jocelyn O. Padallan',
  },
  {
    groupNumber: 4,
    name: 'Group 04',
    studentEmails: ['lanceedwin@gmail.com', 'pinkie.ocampo@gmail.com', 'jasperm.gonzales@gmail.com'],
    title: 'Predictive Student Retention and Academic Risk Detection System Using Ensembled Machine Learning Classifiers',
    adviserName: 'Dr. Crisanto F. Gulay',
    subjectSpecialist: 'Mike Philip T. Ramos',
    statistician: 'Carolina R. Joval',
    technical: 'Jhoco S. Millanes',
  },
  {
    groupNumber: 5,
    name: 'Group 05',
    studentEmails: ['harvy.villamayor@gmail.com', 'irahshane.bacolod@gmail.com', 'johnpaul.delarueda@gmail.com'],
    title: 'Real-Time Bidirectional Sign Language Translation and Speech Synthesis Utilizing Deep Spatial-Temporal Graph Networks',
    adviserName: 'Jocelyn O. Padallan',
    subjectSpecialist: 'Wilson B. Suyat',
    statistician: 'Dr. Sherwin B. Sapin',
    technical: 'Myra V. Paicaglino',
  },
  {
    groupNumber: 6,
    name: 'Group 06',
    studentEmails: ['ronalfred.palis@gmail.com', 'pauldaniel.llanes@gmail.com', 'markphilip.esplana@gmail.com'],
    title: 'Graph Neural Network-Based Anomaly Detection for Network Intrusion and Malicious Behavioral Analysis in Enterprise Networks',
    adviserName: 'Alejandro V. Matute Jr.',
    subjectSpecialist: 'Dr. Crisanto F. Gulay',
    statistician: 'Carolina R. Joval',
    technical: 'Jhoco S. Millanes',
  },
  {
    groupNumber: 7,
    name: 'Group 07',
    studentEmails: ['josemari.macaleng@gmail.com', 'justine.natal@gmail.com', 'giancarlo.botones@gmail.com'],
    title: 'Autonomous Micro-Climate Regulation and Crop Yield Prediction in Smart Hydroponics Using IoT Sensor Networks and Recurrent Models',
    adviserName: 'Jonardo R. Asor',
    subjectSpecialist: 'Jonalyn Joy B. Labayne',
    statistician: 'Carolina R. Joval',
    technical: 'Myra V. Paicaglino',
  },
  {
    groupNumber: 8,
    name: 'Group 08',
    studentEmails: ['rafael.perez@gmail.com', 'carljoseph.rosales@gmail.com', 'ronnell.asinas@gmail.com', 'jeruslalyn.mundia@gmail.com'],
    title: 'Zero-Shot Medical Image Segmentation and Anomaly Classification for Pulmonary Pathologies Using Hybrid Vision Transformers',
    adviserName: 'Dr. Loyd S. Echalar',
    subjectSpecialist: 'Gene Marck B. Catedrilla',
    statistician: 'Jonardo R. Asor',
    technical: 'Jocelyn O. Padallan',
  },
];

async function run() {
  console.log('--- Starting CS/IS Group and Faculty Provisioning ---');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected successfully.');

  const rootDir = process.cwd();
  const parentDir = path.resolve(rootDir, '..');
  const findServiceAccount = () => {
    const dirsToSearch = [rootDir, parentDir];
    for (const dir of dirsToSearch) {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'serviceAccountKey.json' || (file.includes('firebase-adminsdk') && file.endsWith('.json'))) {
          return path.resolve(dir, file);
        }
      }
    }
    return null;
  };

  const saPath = findServiceAccount();
  if (saPath) {
    admin.initializeApp({ credential: admin.credential.cert(saPath) });
  } else if (process.env.FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
  } else {
    throw new Error('Firebase credentials not found');
  }

  const db = admin.firestore();
  const MongoUser = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ uid: String }, { strict: false }));
  const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', new mongoose.Schema({ id: String }, { strict: false }));

  // 1. Provision Faculty Accounts
  console.log('\n--- 1. Provisioning 18 Faculty Accounts ---');
  const facultyMap = new Map(); // name -> { uid, email, fullName }

  for (const f of facultyList) {
    let uid;
    try {
      try {
        const userRec = await admin.auth().getUserByEmail(f.email);
        uid = userRec.uid;
        console.log(`Faculty account already exists in Firebase Auth: ${f.email}`);
        await admin.auth().updateUser(uid, {
          password: f.password,
          displayName: f.fullName
        });
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          const userRec = await admin.auth().createUser({
            email: f.email,
            password: f.password,
            displayName: f.fullName
          });
          uid = userRec.uid;
          console.log(`Created new Firebase Auth user: ${f.email}`);
        } else {
          throw e;
        }
      }

      const facultyDoc = {
        uid,
        email: f.email,
        first_name: f.firstName,
        last_name: f.lastName,
        fullName: f.fullName,
        role: 'adviser',
        role_id: 'adviser',
        department: 'College of Computer Studies',
        college: 'College of Computer Studies',
        program: 'Computer Science',
        status: 'active',
        is_approved: true,
        isAvailable: true,
        maxCapacity: 5,
        specialization: ['Computer Science', 'Intelligent Systems', 'Information Technology'],
        updated_at: new Date().toISOString()
      };

      await MongoUser.findOneAndUpdate({ uid }, facultyDoc, { upsert: true, new: true, setDefaultsOnInsert: true });
      await db.collection('users').doc(uid).set(facultyDoc, { merge: true });

      facultyMap.set(f.fullName, { uid, email: f.email, fullName: f.fullName });
      console.log(`Synced faculty record in Mongo & Firestore: ${f.fullName}`);
    } catch (err) {
      console.error(`Error provisioning faculty ${f.fullName}:`, err.message);
    }
  }

  // Save faculty passwords to faculty_credentials.json
  fs.writeFileSync(
    path.join(__dirname, 'faculty_credentials.json'),
    JSON.stringify(facultyList, null, 2)
  );
  console.log('Saved faculty credentials to faculty_credentials.json');

  // 2. Fetch Students from MongoDB / Firestore
  console.log('\n--- 2. Fetching Student Cohort ---');
  const studentMap = new Map(); // email -> student doc
  const dbStudents = await MongoUser.find({ role: 'student' }).lean();
  for (const s of dbStudents) {
    if (s.email) {
      studentMap.set(s.email.toLowerCase(), s);
    }
  }

  // 3. Provision the 8 Groups
  console.log('\n--- 3. Provisioning 8 CS/IS Research Groups & Proposals ---');
  const now = new Date().toISOString();
  const academicYear = '2026-2027';
  const semester = '1st';
  const courseId = 'bscs';
  const courseName = 'BSCS';
  const sectionId = 'bscs-sec-a';
  const sectionName = 'A';

  for (const g of plannedGroups) {
    console.log(`\nProcessing ${g.name}...`);
    
    // Resolve members
    const members = [];
    const memberIds = [];

    for (const email of g.studentEmails) {
      const student = studentMap.get(email.toLowerCase());
      if (student && student.uid) {
        members.push({
          uid: student.uid,
          fullName: student.fullName || `${student.first_name} ${student.last_name}`,
          email: student.email,
          studentNumber: student.studentId || student.studentIdOrEmployeeId || ''
        });
        memberIds.push(student.uid);
      } else {
        console.warn(`Warning: Student with email ${email} not found in DB`);
      }
    }

    // Resolve adviser & panelists
    const adviserObj = facultyMap.get(g.adviserName);
    const specialistObj = facultyMap.get(g.subjectSpecialist);
    const statObj = facultyMap.get(g.statistician);
    const techObj = facultyMap.get(g.technical);

    const panelists = [
      {
        name: g.subjectSpecialist,
        role: 'Subject Specialist',
        id: specialistObj ? specialistObj.uid : ''
      },
      {
        name: g.statistician,
        role: 'Statistician',
        id: statObj ? statObj.uid : ''
      },
      {
        name: g.technical,
        role: 'Technical',
        id: techObj ? techObj.uid : ''
      }
    ];

    // Check if group already exists in Firestore by name & section
    let groupId;
    const existingSnap = await db.collection('research_groups')
      .where('name', '==', g.name)
      .where('sectionId', '==', sectionId)
      .get();

    if (!existingSnap.empty) {
      groupId = existingSnap.docs[0].id;
      console.log(`Found existing Firestore group ${groupId} for ${g.name}`);
    } else {
      const newRef = db.collection('research_groups').doc();
      groupId = newRef.id;
      console.log(`Creating new Firestore group ${groupId} for ${g.name}`);
    }

    const groupDoc = {
      id: groupId,
      name: g.name,
      courseId,
      courseName,
      sectionId,
      sectionName,
      yearLevel: 4,
      academicYear,
      semester,
      memberIds,
      members,
      status: 'ready',
      adviserId: adviserObj ? adviserObj.uid : '',
      adviserName: g.adviserName,
      title: g.title,
      panelists,
      updatedAt: now,
      createdAt: now
    };

    await db.collection('research_groups').doc(groupId).set(groupDoc, { merge: true });

    // Also sync to MongoDB research_groups collection
    await MongoGroup.findOneAndUpdate({ id: groupId }, groupDoc, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });

    // Update each student user record with groupId and groupName
    for (const member of members) {
      const updatePayload = {
        groupId: groupId,
        groupName: g.name,
        researchTitle: g.title,
        adviserId: adviserObj ? adviserObj.uid : '',
        adviserName: g.adviserName,
        courseId,
        sectionId,
        specializationId: 'is'
      };
      await MongoUser.findOneAndUpdate({ uid: member.uid }, updatePayload);
      await db.collection('users').doc(member.uid).set(updatePayload, { merge: true });
    }

    // 4. Create Approved Title Proposal in Firestore
    const existingPropSnap = await db.collection('proposals')
      .where('groupId', '==', groupId)
      .get();

    let proposalId;
    if (!existingPropSnap.empty) {
      proposalId = existingPropSnap.docs[0].id;
    } else {
      proposalId = db.collection('proposals').doc().id;
    }

    const proposalDoc = {
      id: proposalId,
      title: g.title,
      description: `Intelligent Systems Capstone Research Proposal for ${g.name}`,
      rationale: `Approved research title for Computer Science / Intelligent Systems track.`,
      objectives: `1. Design and develop the proposed system architecture.\n2. Implement the core machine learning and intelligent models.\n3. Evaluate model accuracy, performance, and user acceptability.`,
      scopeAndDelimitation: `Focuses on the BSCS Intelligent Systems domain and target deployment environment for academic year ${academicYear}.`,
      methodology: `Quantitative experimental design and agile development methodology.`,
      attachments: [],
      studentId: members.length > 0 ? members[0].uid : '',
      studentName: members.length > 0 ? members[0].fullName : '',
      groupId: groupId,
      groupName: g.name,
      memberIds,
      members,
      courseId,
      courseName,
      sectionId,
      sectionName,
      academicYear,
      semester,
      status: 'approved',
      updatedAt: now,
      createdAt: now
    };

    await db.collection('proposals').doc(proposalId).set(proposalDoc, { merge: true });
    await db.collection('research_groups').doc(groupId).update({ proposalId, title: g.title });

    console.log(`Successfully configured ${g.name} (Title Proposal ID: ${proposalId})`);
  }

  console.log('\n======================================================');
  console.log('CS/IS Group and Faculty Provisioning Completed Successfully!');
  console.log('======================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal error during provisioning:', err);
  process.exit(1);
});
