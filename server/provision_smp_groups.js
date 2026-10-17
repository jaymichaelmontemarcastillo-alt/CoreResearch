import { auth, db } from './src/config/firebaseAdmin.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MongoGroupSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: String,
  title: String,
  courseId: String,
  courseName: String,
  specializationId: String,
  specialization: String,
  sectionId: String,
  sectionName: String,
  academicYear: String,
  semester: String,
  status: { type: String, default: 'ready' },
  adviserId: String,
  adviserName: String,
  panelists: Array,
  panelistIds: [String],
  panelistNames: [String],
  members: Array,
  memberIds: [String],
  leaderId: String,
  isArchived: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
}, { collection: 'researchgroups', timestamps: false });

const MongoUserSchema = new mongoose.Schema({
  uid: { type: String, unique: true },
  email: String,
  fullName: String,
  first_name: String,
  last_name: String,
  role: String,
  role_id: String,
  department: String,
  department_id: String,
  studentId: String,
  studentIdOrEmployeeId: String,
  courseId: String,
  program_id: String,
  program: String,
  programCode: String,
  specializationId: String,
  specialization: String,
  major: String,
  majorCode: String,
  programSpecialization: String,
  sectionId: String,
  sectionName: String,
  section: String,
  groupId: String,
  groupName: String,
  researchTitle: String,
  adviserId: String,
  adviserName: String,
  status: { type: String, default: 'active' },
  is_approved: { type: Boolean, default: true },
  updatedAt: String,
  updated_at: String
}, { collection: 'users', timestamps: false });

const MongoGroup = mongoose.models.ResearchGroup || mongoose.model('ResearchGroup', MongoGroupSchema);
const MongoUser = mongoose.models.User || mongoose.model('User', MongoUserSchema);

const FACULTY = {
  SHERWIN_SAPIN: { name: 'Dr. Sherwin B. Sapin', uid: 'ZZGTg6gwaLZfTXoht4JnUYqV8Uh1' },
  CRISANTO_GULAY: { name: 'Dr. Crisanto F. Gulay', uid: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682' },
  CAROLINA_JOVAL: { name: 'Carolina R. Joval', uid: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2' },
  JOCELYN_PADALLAN: { name: 'Jocelyn O. Padallan', uid: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33' },
  GENE_CATEDRILLA: { name: 'Gene Marck B. Catedrilla', uid: '6iSuoiMxDUMwR3Y5ncVRC2XAFyk1' },
  ANDRES_VICEDO: { name: 'Andres R. Vicedo', uid: 'lpm95BoaKlRiYmM4Z83JsqUOyGt2' },
  ALEJANDRO_MATUTE: { name: 'Alejandro V. Matute Jr.', uid: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2' },
  MIKE_RAMOS: { name: 'Mike Philip T. Ramos', uid: '79h7GjlDcYgpc4P7UlyFVBDWvXF2' },
  JHOCO_MILLANES: { name: 'Jhoco S. Millanes', uid: '1VoJgdIs0CNeJKBfzBdjz6FGQkV2' },
  WILSON_SUYAT: { name: 'Wilson B. Suyat', uid: '7McJ04RrsvcTMFrCelJCHJml3D02' },
  MYRA_PAICAGLINO: { name: 'Myra V. Paicaglino', uid: 'Ln22hthmGKSMGaHIdrRjnZI1w452' },
  JONALYN_LABAYNE: { name: 'Jonalyn Joy B. Labayne', uid: 'N8U4UdylR8QX6p1CZu4aWFZfXFi2' },
  LOYD_ECHALAR: { name: 'Dr. Loyd S. Echalar', uid: 'K59LHpThtzVgVLuaSBMTTRpmuvC3' },
  MARIBEL_CARDONA: { name: 'Maribel V. Cardona', uid: '2wKxrw778QVxsPg7lk8uJOmdAQx1' },
  JEFFERSON_LERIOS: { name: 'Jefferson L. Lerios', uid: 'ktgkHySP6OZA7gMNRLfNsrFwIhw2' },
};

const smpGroupsData = [
  {
    groupNumber: 1,
    name: 'Group 01',
    id: 'group-smp-01',
    title: 'Evaluating a Fuzzy Logic-Enhanced Genetic Algorithm for Irrigation Scheduling and Water Use Efficiency in Rice Paddies',
    adviser: FACULTY.SHERWIN_SAPIN,
    panelists: [
      { name: FACULTY.CRISANTO_GULAY.name, id: FACULTY.CRISANTO_GULAY.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Rhei Earlson T. Malatag', email: 'rheiearlson.malatag@student.lspu.edu.ph', studentNumber: '0424-5001' },
      { fullName: 'Czarina Joy L. Sanchez', email: 'czarinajoy.sanchez@student.lspu.edu.ph', studentNumber: '0424-5002' },
      { fullName: 'Amiel Isaac V. Solmerano', email: 'amielisaac.solmerano@student.lspu.edu.ph', studentNumber: '0424-5003' },
      { fullName: 'Cleid Eduard I. Palisoc', email: 'cleideduard.palisoc@student.lspu.edu.ph', studentNumber: '0424-5004' }
    ]
  },
  {
    groupNumber: 2,
    name: 'Group 02',
    id: 'group-smp-02',
    title: 'Viral Truths: AI-Powered Detection and Annotation of Health Misinformation on social media through a Browser Extension',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.ANDRES_VICEDO.name, id: FACULTY.ANDRES_VICEDO.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Charles Amiel A. Malabanan', email: 'charlesamiel.malabanan@student.lspu.edu.ph', studentNumber: '0424-5005' },
      { fullName: 'Lyx lamuel B. Dilla', email: 'lyxlamuel.dilla@student.lspu.edu.ph', studentNumber: '0424-5006' },
      { fullName: 'Andrei Gonzaga', email: 'andrei.gonzaga@student.lspu.edu.ph', studentNumber: '0424-5007' }
    ]
  },
  {
    groupNumber: 3,
    name: 'Group 03',
    id: 'group-smp-03',
    title: 'An Integrated Digital Beneficiary Verification and Distribution Monitoring System Utilizing Data Visualization for KADIWA Center at DA-BPI Los Banos NCRDPSC',
    adviser: FACULTY.ALEJANDRO_MATUTE,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Rhixei Carpio', email: 'rhixei.carpio@student.lspu.edu.ph', studentNumber: '0424-5008' },
      { fullName: 'Lheilah Tandang', email: 'lheilah.tandang@student.lspu.edu.ph', studentNumber: '0424-5009' },
      { fullName: 'Reginaldo Orencia Jr.', email: 'reginaldo.orencia@student.lspu.edu.ph', studentNumber: '0424-5010' }
    ]
  },
  {
    groupNumber: 4,
    name: 'Group 04',
    id: 'group-smp-04',
    title: 'Development of a Web-Based Market Analysis and Tourism Promotion System for Festival in Laguna',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.ALEJANDRO_MATUTE.name, id: FACULTY.ALEJANDRO_MATUTE.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'John Kenneth Quintos', email: 'johnkenneth.quintos@student.lspu.edu.ph', studentNumber: '0424-5011' },
      { fullName: 'Samuel Villamayor', email: 'samuel.villamayor@student.lspu.edu.ph', studentNumber: '0424-5012' },
      { fullName: 'Jose Gabrielle Malvar', email: 'josegabrielle.malvar@student.lspu.edu.ph', studentNumber: '0424-5013' }
    ]
  },
  {
    groupNumber: 5,
    name: 'Group 05',
    id: 'group-smp-05',
    title: 'EqualAccess Portal: A Data-Driven System for Government Benefits for Persons with Disabilities',
    adviser: FACULTY.JOCELYN_PADALLAN,
    panelists: [
      { name: FACULTY.WILSON_SUYAT.name, id: FACULTY.WILSON_SUYAT.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Gretchen Andaya', email: 'gretchen.andaya@student.lspu.edu.ph', studentNumber: '0424-5014' },
      { fullName: 'Samantha Jasmine Alcantara', email: 'samanthajasmine.alcantara@student.lspu.edu.ph', studentNumber: '0424-5015' },
      { fullName: 'Angel Kim Hubilla', email: 'angelkim.hubilla@student.lspu.edu.ph', studentNumber: '0424-5016' }
    ]
  },
  {
    groupNumber: 6,
    name: 'Group 06',
    id: 'group-smp-06',
    title: 'FiBott: An IoT-Enabled Recycling-Driven Internet Access Machine Transforming Plastic Bottles and Soda Cans into Digital Connectivity',
    adviser: FACULTY.SHERWIN_SAPIN,
    panelists: [
      { name: FACULTY.WILSON_SUYAT.name, id: FACULTY.WILSON_SUYAT.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Joshua Paul Mataverde', email: 'joshuapaul.mataverde@student.lspu.edu.ph', studentNumber: '0424-5017' },
      { fullName: 'Zack Xavier Refrea', email: 'zackxavier.refrea@student.lspu.edu.ph', studentNumber: '0424-5018' },
      { fullName: 'Marc Dominique Juarez', email: 'marcdominique.juarez@student.lspu.edu.ph', studentNumber: '0424-5019' }
    ]
  },
  {
    groupNumber: 7,
    name: 'Group 07',
    id: 'group-smp-07',
    title: 'Web Base Donation Auditing and Impact Tracking System with Real Time Reporting and Beneficiary Verification',
    adviser: FACULTY.JONALYN_LABAYNE,
    panelists: [
      { name: FACULTY.LOYD_ECHALAR.name, id: FACULTY.LOYD_ECHALAR.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Benedict Vincent Reyes', email: 'benedictvincent.reyes@student.lspu.edu.ph', studentNumber: '0424-5020' },
      { fullName: 'Jaymart Cabuhat', email: 'jaymart.cabuhat@student.lspu.edu.ph', studentNumber: '0424-5021' },
      { fullName: 'Joshua Angelo Berdon', email: 'joshuaangelo.berdon@student.lspu.edu.ph', studentNumber: '0424-5022' }
    ]
  },
  {
    groupNumber: 8,
    name: 'Group 08',
    id: 'group-smp-08',
    title: 'Web-Based Construction Service Selection and Project Showcase System for AG Construction Builders',
    adviser: FACULTY.JOCELYN_PADALLAN,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Racil Picardal', email: 'racil.picardal@student.lspu.edu.ph', studentNumber: '0424-5023' },
      { fullName: 'Joseph Christian Ferrer', email: 'josephchristian.ferrer@student.lspu.edu.ph', studentNumber: '0424-5024' },
      { fullName: 'Aldrin Terbio', email: 'aldrin.terbio@student.lspu.edu.ph', studentNumber: '0424-5025' }
    ]
  },
  {
    groupNumber: 9,
    name: 'Group 09',
    id: 'group-smp-09',
    title: 'Womenbiz: A Digital Service Marketplace and Business Analytics Platform for Women Entrepreneurs',
    adviser: FACULTY.SHERWIN_SAPIN,
    panelists: [
      { name: FACULTY.MARIBEL_CARDONA.name, id: FACULTY.MARIBEL_CARDONA.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Gife Charles Marty Laforteza', email: 'gifecharlesmarty.laforteza@student.lspu.edu.ph', studentNumber: '0424-5026' },
      { fullName: 'Algirho Mañosca', email: 'algirho.manosca@student.lspu.edu.ph', studentNumber: '0424-5027' },
      { fullName: 'Rodmarck Alvin Oboza', email: 'rodmarckalvin.oboza@student.lspu.edu.ph', studentNumber: '0424-5028' }
    ]
  },
  {
    groupNumber: 10,
    name: 'Group 10',
    id: 'group-smp-10',
    title: 'Image-Assisted Likert Scale Mental Health Screening System for Anxiety and Stress Level Assessment Among LSPU Students',
    adviser: FACULTY.JOCELYN_PADALLAN,
    panelists: [
      { name: FACULTY.WILSON_SUYAT.name, id: FACULTY.WILSON_SUYAT.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Josefa Paula Eusebio', email: 'josefapaula.eusebio@student.lspu.edu.ph', studentNumber: '0424-5029' },
      { fullName: 'Mark Raniel Decena', email: 'markraniel.decena@student.lspu.edu.ph', studentNumber: '0424-5030' }
    ]
  },
  {
    groupNumber: 11,
    name: 'Group 11',
    id: 'group-smp-11',
    title: 'Laundry Shop Management with customer tracking and Notification System',
    adviser: FACULTY.JEFFERSON_LERIOS,
    panelists: [
      { name: FACULTY.WILSON_SUYAT.name, id: FACULTY.WILSON_SUYAT.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Edzel Angelo Masagca', email: 'edzelangelo.masagca@student.lspu.edu.ph', studentNumber: '0424-5031' },
      { fullName: 'Christian Cabisada', email: 'christian.cabisada@student.lspu.edu.ph', studentNumber: '0424-5032' },
      { fullName: 'Daniella Dael', email: 'daniella.dael@student.lspu.edu.ph', studentNumber: '0424-5033' }
    ]
  },
  {
    groupNumber: 12,
    name: 'Group 12',
    id: 'group-smp-12',
    title: 'Web-Based Tricycle Franchise Application and Approval System with Driver Portal and Automated Status Tracking',
    adviser: FACULTY.JEFFERSON_LERIOS,
    panelists: [
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Nomer Ray Aguas', email: 'nomerray.aguas@student.lspu.edu.ph', studentNumber: '0424-5034' },
      { fullName: 'Wyn Francis Kiel Candido', email: 'wynfranciskiel.candido@student.lspu.edu.ph', studentNumber: '0424-5035' }
    ]
  },
  {
    groupNumber: 13,
    name: 'Group 13',
    id: 'group-smp-13',
    title: 'Development of Web-Based Project Management System with Interactive Mapping for the Municipal Planning and Development Office of Bay, Laguna',
    adviser: FACULTY.JEFFERSON_LERIOS,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Noemelyn Abasola', email: 'noemelyn.abasola@student.lspu.edu.ph', studentNumber: '0424-5036' },
      { fullName: 'Christka May Collado', email: 'christkamay.collado@student.lspu.edu.ph', studentNumber: '0424-5037' },
      { fullName: 'Maureen Jane Manalo', email: 'maureenjane.manalo@student.lspu.edu.ph', studentNumber: '0424-5038' }
    ]
  }
];

const defaultPassword = 'Student2026_LSPU!';
const academicYear = '2026-2027';
const semester = '1st';
const courseId = 'bsit';
const courseName = 'Bachelor of Science in Information Technology';
const programCode = 'BSIT';
const specializationId = 'smp';
const specialization = 'Service and Management Program';
const sectionId = 'okmVx3kjHJ80SGHA3aWv';
const sectionName = 'A';

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  const allCredentials = [];

  for (const group of smpGroupsData) {
    console.log(`\nProcessing SMP Section A -> ${group.name}: "${group.title.substring(0, 50)}..."`);

    // 1. Students
    for (const student of group.students) {
      let uid = student.uid;
      const email = student.email.toLowerCase();

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

      let authUser = null;
      try {
        authUser = await auth.getUserByEmail(email);
        uid = authUser.uid;
      } catch (e) {
        // Not in Auth
      }

      if (!authUser && !uid) {
        try {
          authUser = await auth.createUser({
            email,
            password: defaultPassword,
            displayName: student.fullName,
          });
          uid = authUser.uid;
          allCredentials.push({
            fullName: student.fullName,
            email,
            password: defaultPassword,
            uid,
            classification: 'BSIT — SMP — Section A',
            group: group.name
          });
          console.log(`  ✓ Created Auth User: ${student.fullName} (${email}) -> UID: ${uid}`);
        } catch (authErr) {
          console.error(`  ✗ Auth user creation failed for ${student.fullName}:`, authErr.message);
          uid = db.collection('users').doc().id;
        }
      } else {
        console.log(`  ✓ Reusing User Account: ${student.fullName} (${email}) -> UID: ${uid}`);
      }

      student.uid = uid;

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
        specialization: specializationId.toUpperCase(),
        major: specializationId.toUpperCase(),
        majorCode: specializationId.toUpperCase(),
        programSpecialization: specializationId.toUpperCase(),
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

    // 2. Group Record
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
      specialization: specializationId.toUpperCase(),
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

    await db.collection('research_groups').doc(group.id).set(groupDoc, { merge: true });
    await MongoGroup.findOneAndUpdate({ id: group.id }, groupDoc, { upsert: true, new: true });

    // 3. Proposal
    const proposalId = `prop-${group.id}`;
    const proposalDoc = {
      id: proposalId,
      groupId: group.id,
      groupName: group.name,
      title: group.title,
      description: `SMP Capstone Research for ${group.name}.`,
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

    // 4. Manuscript Workspace
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
      researchDescription: `SMP Capstone Research for ${group.name}.`,
      adviserId: group.adviser.uid,
      adviserName: group.adviser.name,
      compatibilityScore: 95,
      status: 'accepted',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.collection('adviser_requests').doc(reqId).set(adviserReqDoc, { merge: true });

    console.log(`  ✓ Finished Group ${group.name} (${memberObjects.length} members, 3 panelists)`);
  }

  // Save student credentials to file
  const credsPath = path.join(__dirname, 'smp_student_credentials.json');
  fs.writeFileSync(credsPath, JSON.stringify(allCredentials, null, 2));
  console.log(`\nAll newly created credentials saved to: ${credsPath}`);

  console.log('\n================================================================');
  console.log('   ALL 13 SMP GROUPS & 38 STUDENT MEMBERS PROVISIONED');
  console.log('================================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('PROVISIONING ERROR:', err);
  process.exit(1);
});
