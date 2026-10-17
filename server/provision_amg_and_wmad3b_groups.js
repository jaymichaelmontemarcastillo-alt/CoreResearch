import { auth, db } from './src/config/firebaseAdmin.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// --- MongoDB Models ---
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

// --- FACULTY UIDS ---
const FACULTY = {
  JOCELYN_PADALLAN: { name: 'Jocelyn O. Padallan', uid: 'h1vvIU0hPsR7U5H1LhwjJFZqMK33' },
  WILSON_SUYAT: { name: 'Wilson B. Suyat', uid: '7McJ04RrsvcTMFrCelJCHJml3D02' },
  CAROLINA_JOVAL: { name: 'Carolina R. Joval', uid: '4lMhtAXgIXfcQj5ADH8wNgL8UxP2' },
  MYRA_PAICAGLINO: { name: 'Myra V. Paicaglino', uid: 'Ln22hthmGKSMGaHIdrRjnZI1w452' },
  LOYD_ECHALAR: { name: 'Dr. Loyd S. Echalar', uid: 'K59LHpThtzVgVLuaSBMTTRpmuvC3' },
  MIKE_RAMOS: { name: 'Mike Philip T. Ramos', uid: '79h7GjlDcYgpc4P7UlyFVBDWvXF2' },
  JHOCO_MILLANES: { name: 'Jhoco S. Millanes', uid: '1VoJgdIs0CNeJKBfzBdjz6FGQkV2' },
  JONALYN_LABAYNE: { name: 'Jonalyn Joy B. Labayne', uid: 'N8U4UdylR8QX6p1CZu4aWFZfXFi2' },
  MORRIS_JEBONE: { name: 'Morris V. Jebone', uid: 'JcpS22JpczPLEhZyimnv1XBYRmh2' },
  SHERWIN_SAPIN: { name: 'Dr. Sherwin B. Sapin', uid: 'ZZGTg6gwaLZfTXoht4JnUYqV8Uh1' },
  JEFFERSON_LERIOS: { name: 'Jefferson L. Lerios', uid: 'ktgkHySP6OZA7gMNRLfNsrFwIhw2' },
  CRISANTO_GULAY: { name: 'Dr. Crisanto F. Gulay', uid: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682' },
  ALEJANDRO_MATUTE: { name: 'Alejandro V. Matute Jr.', uid: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2' },
  GENE_CATEDRILLA: { name: 'Gene Marck B. Catedrilla', uid: '6iSuoiMxDUMwR3Y5ncVRC2XAFyk1' },
  MARIBEL_CARDONA: { name: 'Maribel V. Cardona', uid: '2wKxrw778QVxsPg7lk8uJOmdAQx1' },
  MAVERICK_MOLDEZ: { name: 'Maverick U. Moldez', uid: 'b38GCA7qDzVaGLqGpR700gxUDVD3' },
  JONARDO_ASOR: { name: 'Jonardo R. Asor', uid: 'W4ncOxyN7zUynXqYigMalklG9kP2' },
};

// --- DATA DEFINITION: AMG SECTION A ---
const amgGroupsData = [
  {
    groupNumber: 1,
    name: 'Group 01',
    id: 'group-amg-01',
    title: 'HandSpeak: A Mobile App for Sign Language Learning',
    adviser: FACULTY.JOCELYN_PADALLAN,
    panelists: [
      { name: FACULTY.WILSON_SUYAT.name, id: FACULTY.WILSON_SUYAT.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Aubrey De Leon', email: 'aubrey.deleon@student.lspu.edu.ph', studentNumber: '0424-3001' },
      { fullName: 'Abel Pingol', email: 'abel.pingol@student.lspu.edu.ph', studentNumber: '0424-3002' },
      { fullName: 'Froilan Rodejo', email: 'froilan.rodejo@student.lspu.edu.ph', studentNumber: '0424-3003' }
    ]
  },
  {
    groupNumber: 2,
    name: 'Group 02',
    id: 'group-amg-02',
    title: 'ASP APP: A Gamified Digital Learning Application for Children with Autism Spectrum Disorder in Autism Society Philippines - Laguna Chapter',
    adviser: FACULTY.LOYD_ECHALAR,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Eizekiel Casipong', email: 'eizekiel.casipong@student.lspu.edu.ph', studentNumber: '0424-3004' },
      { fullName: 'Christian Joshua Angeles', email: 'christianjoshua.angeles@student.lspu.edu.ph', studentNumber: '0424-3005' },
      { fullName: 'Gabbie Manalo', email: 'gabbie.manalo@student.lspu.edu.ph', studentNumber: '0424-3006' }
    ]
  },
  {
    groupNumber: 3,
    name: 'Group 03',
    id: 'group-amg-03',
    title: 'Ctrl + Think: An Interactive Visual Novel Game Exploring AI Dependency Among College Students',
    adviser: FACULTY.JONALYN_LABAYNE,
    panelists: [
      { name: FACULTY.MORRIS_JEBONE.name, id: FACULTY.MORRIS_JEBONE.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'John Lorence B. Amarela', email: 'johnlorence.amarela@student.lspu.edu.ph', studentNumber: '0424-3007' },
      { fullName: 'Andrei Caldeo', email: 'andrei.caldeo@student.lspu.edu.ph', studentNumber: '0424-3008' },
      { fullName: 'Christian B. Añez', email: 'christian.anez@student.lspu.edu.ph', studentNumber: '0424-3009' }
    ]
  },
  {
    groupNumber: 4,
    name: 'Group 04',
    id: 'group-amg-04',
    title: 'Development of a 3D Model Walk Through for Different Offices’ Services of Los Baños Municipal Building',
    adviser: FACULTY.LOYD_ECHALAR,
    panelists: [
      { name: FACULTY.MORRIS_JEBONE.name, id: FACULTY.MORRIS_JEBONE.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'John Micheal R. Milanes', email: 'johnmicheal.milanes@student.lspu.edu.ph', studentNumber: '0424-3010' },
      { fullName: 'Jeno A. Lapore', email: 'jeno.lapore@student.lspu.edu.ph', studentNumber: '0424-3011' },
      { fullName: 'Marc Luigie B. Palcon', email: 'marcluigie.palcon@student.lspu.edu.ph', studentNumber: '0424-3012' }
    ]
  },
  {
    groupNumber: 5,
    name: 'Group 05',
    id: 'group-amg-05',
    title: 'An Interactive 3D Virtual Fish Anatomy Application for Improved Learning and Visualization',
    adviser: FACULTY.JOCELYN_PADALLAN,
    panelists: [
      { name: FACULTY.LOYD_ECHALAR.name, id: FACULTY.LOYD_ECHALAR.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Shaina Mae G. Vidal', email: 'shainamae.vidal@student.lspu.edu.ph', studentNumber: '0424-3013' },
      { fullName: 'Vincent Espinosa', email: 'vincent.espinosa@student.lspu.edu.ph', studentNumber: '0424-3014' },
      { fullName: 'William Escobar', email: 'william.escobar@student.lspu.edu.ph', studentNumber: '0424-3015' }
    ]
  },
  {
    groupNumber: 6,
    name: 'Group 06',
    id: 'group-amg-06',
    title: 'A Mobile Game-Based Learning Application for Financial Literacy Skills',
    adviser: FACULTY.JEFFERSON_LERIOS,
    panelists: [
      { name: FACULTY.JONALYN_LABAYNE.name, id: FACULTY.JONALYN_LABAYNE.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Paulette Jan M. Meña', email: 'paulettejan.mena@student.lspu.edu.ph', studentNumber: '0424-3016' },
      { fullName: 'Mary Joy Eusebio', email: 'maryjoy.eusebio@student.lspu.edu.ph', studentNumber: '0424-3017' },
      { fullName: 'Lorraine S. San Miguel', email: 'lorraine.sanmiguel@student.lspu.edu.ph', studentNumber: '0424-3018' }
    ]
  },
  {
    groupNumber: 7,
    name: 'Group 07',
    id: 'group-amg-07',
    title: 'Pace Move: Design and Development of an Animated Interactive Fitness Game Using Motion-Based Activity Tracking',
    adviser: FACULTY.CRISANTO_GULAY,
    panelists: [
      { name: FACULTY.MORRIS_JEBONE.name, id: FACULTY.MORRIS_JEBONE.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Khyle Otano', email: 'khyle.otano@student.lspu.edu.ph', studentNumber: '0424-3019' },
      { fullName: 'Renly Patricio', email: 'renly.patricio@student.lspu.edu.ph', studentNumber: '0424-3020' },
      { fullName: 'Aldwin Kiester P. Ediza', email: 'aldwinkiester.ediza@student.lspu.edu.ph', studentNumber: '0424-3021' }
    ]
  },
  {
    groupNumber: 8,
    name: 'Group 08',
    id: 'group-amg-08',
    title: 'TADLAC 360: A Virtual Tour of Alligator Lake in Barangay Tadlak',
    adviser: FACULTY.CRISANTO_GULAY,
    panelists: [
      { name: FACULTY.MORRIS_JEBONE.name, id: FACULTY.MORRIS_JEBONE.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Arren Lei Mendoza', email: 'arrenlei.mendoza@student.lspu.edu.ph', studentNumber: '0424-3022' },
      { fullName: 'Ethan Daniel Monterola', email: 'ethandaniel.monterola@student.lspu.edu.ph', studentNumber: '0424-3023' },
      { fullName: 'Jireh Joice Cortejo', email: 'jirehjoice.cortejo@student.lspu.edu.ph', studentNumber: '0424-3024' }
    ]
  }
];

// --- DATA DEFINITION: WMAD SECTION 3B ---
const wmad3bGroupsData = [
  {
    groupNumber: 1,
    name: 'Group 01',
    id: 'group-wmad3b-01',
    title: 'NutriDeq: A Progressive Web App for Automated Nutrient Monitoring and Smart Nutritional Recommendations Using Bilingual Natural Language Processing',
    adviser: FACULTY.ALEJANDRO_MATUTE,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Jhester Carlo C. Cayetano', email: 'jhestercarlo.cayetano@student.lspu.edu.ph', studentNumber: '0424-4001' },
      { fullName: 'Reymond Kent A. Montecillo', email: 'reymondkent.montecillo@student.lspu.edu.ph', studentNumber: '0424-4002' },
      { fullName: 'James Isaac A. Alvarez', email: 'jamesisaac.alvarez@student.lspu.edu.ph', studentNumber: '0424-4003' }
    ]
  },
  {
    groupNumber: 2,
    name: 'Group 02',
    id: 'group-wmad3b-02',
    title: 'Integrated Web-Based Tourism, Aquaculture Management, and Point-of-Sale (POS) System for the LSPU Aquafarm Tourism Center',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.MARIBEL_CARDONA.name, id: FACULTY.MARIBEL_CARDONA.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JHOCO_MILLANES.name, id: FACULTY.JHOCO_MILLANES.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Brylle Allen D. Bregonia', email: 'brylleallen.bregonia@student.lspu.edu.ph', studentNumber: '0424-4004' },
      { fullName: 'Ronald John S. Bautista', email: 'ronaldjohn.bautista@student.lspu.edu.ph', studentNumber: '0424-4005' },
      { fullName: 'Vincent V. Briñas', email: 'vincent.brinas@student.lspu.edu.ph', studentNumber: '0424-4006' },
      { fullName: 'Ivan Jherome S. Gonzales', email: 'ivanjherome.gonzales@student.lspu.edu.ph', studentNumber: '0424-4007' }
    ]
  },
  {
    groupNumber: 3,
    name: 'Group 03',
    id: 'group-wmad3b-03',
    title: 'Development of a Web-Based System for Innovation and Technology Support Office (ITSO) Utilizing XGBoost and Natural Language Processing',
    adviser: FACULTY.ALEJANDRO_MATUTE,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.SHERWIN_SAPIN.name, id: FACULTY.SHERWIN_SAPIN.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Jewel Anne Keith E. Peleño', email: 'jewelannekeith.peleno@student.lspu.edu.ph', studentNumber: '0424-4008' },
      { fullName: 'Ronel Joshua D. Alforja', email: 'roneljoshua.alforja@student.lspu.edu.ph', studentNumber: '0424-4009' },
      { fullName: 'Lujen M. Dela Rosa', email: 'lujen.delarosa@student.lspu.edu.ph', studentNumber: '0424-4010' }
    ]
  },
  {
    groupNumber: 4,
    name: 'Group 04',
    id: 'group-wmad3b-04',
    title: 'A Machine Learning-Driven Web Mobile System for Screening Cognitive Impairment Through Digital Interaction Patterns',
    adviser: FACULTY.JEFFERSON_LERIOS,
    panelists: [
      { name: FACULTY.MARIBEL_CARDONA.name, id: FACULTY.MARIBEL_CARDONA.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Ray Emylson M. Flores', email: 'rayemylson.flores@student.lspu.edu.ph', studentNumber: '0424-4011' },
      { fullName: 'Edward O. San Antonio', email: 'edward.sanantonio@student.lspu.edu.ph', studentNumber: '0424-4012' },
      { fullName: 'Ron Joseph R. Alcantara', email: 'ronjoseph.alcantara@student.lspu.edu.ph', studentNumber: '0424-4013' }
    ]
  },
  {
    groupNumber: 5,
    name: 'Group 05',
    id: 'group-wmad3b-05',
    title: 'EcoClassify: A Machine Learning-Driven Classification System for Species Based on the Forest Level in the Mount Makiling Forest Reserve',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.ALEJANDRO_MATUTE.name, id: FACULTY.ALEJANDRO_MATUTE.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Richard S. Catindig', email: 'richard.catindig@student.lspu.edu.ph', studentNumber: '0424-4014' },
      { fullName: 'Gabrielle C. Prudente', email: 'gabrielle.prudente@student.lspu.edu.ph', studentNumber: '0424-4015' },
      { fullName: 'Dan Christian G. Polistico', email: 'danchristian.polistico@student.lspu.edu.ph', studentNumber: '0424-4016' }
    ]
  },
  {
    groupNumber: 6,
    name: 'Group 06',
    id: 'group-wmad3b-06',
    title: 'An Intelligent Web-Based System for Baseline and Non-Baseline Data Integration and Socioeconomic Impact Assessment of Livelihood Programs',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.MIKE_RAMOS.name, id: FACULTY.MIKE_RAMOS.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Ivandwight S. Macabulos', email: 'ivandwight.macabulos@student.lspu.edu.ph', studentNumber: '0424-4017' },
      { fullName: 'John Andrei C. Guzman', email: 'johnandrei.guzman@student.lspu.edu.ph', studentNumber: '0424-4018' },
      { fullName: 'Christian Jake A. Ramiro', email: 'christianjake.ramiro@student.lspu.edu.ph', studentNumber: '0424-4019' }
    ]
  },
  {
    groupNumber: 7,
    name: 'Group 07',
    id: 'group-wmad3b-07',
    title: 'TRAINWISE: A Web and Mobile-Based Employee Training Needs Assessment and Recommendation System Using XGBoost and Natural Language Processing',
    adviser: FACULTY.ALEJANDRO_MATUTE,
    panelists: [
      { name: FACULTY.CRISANTO_GULAY.name, id: FACULTY.CRISANTO_GULAY.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Sean John R. Looc', email: 'seanjohn.looc@student.lspu.edu.ph', studentNumber: '0424-4020' },
      { fullName: 'Gian Carlo I. Maranan', email: 'giancarlo.maranan@student.lspu.edu.ph', studentNumber: '0424-4021' },
      { fullName: 'Klyde Cisco T. Canapi', email: 'klydecisco.canapi@student.lspu.edu.ph', studentNumber: '0424-4022' },
      { fullName: 'Brenderick I. Amparo Jr.', email: 'brenderick.amparo@student.lspu.edu.ph', studentNumber: '0424-4023' }
    ]
  },
  {
    groupNumber: 8,
    name: 'Group 08',
    id: 'group-wmad3b-08',
    title: 'A Web-Based Decision Support System for Performance Monitoring and Analytics of DOST-PCAARRD Funded Research and Development Programs/Projects in the Inland Aquatic Resources',
    adviser: FACULTY.GENE_CATEDRILLA,
    panelists: [
      { name: FACULTY.MORRIS_JEBONE.name, id: FACULTY.MORRIS_JEBONE.uid, role: 'Subject Specialist' },
      { name: FACULTY.MAVERICK_MOLDEZ.name, id: FACULTY.MAVERICK_MOLDEZ.uid, role: 'Statistician' },
      { name: FACULTY.JOCELYN_PADALLAN.name, id: FACULTY.JOCELYN_PADALLAN.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'John Edward P. Opulencia', email: 'johnedward.opulencia@student.lspu.edu.ph', studentNumber: '0424-4024' },
      { fullName: 'Justine G. Suiza', email: 'justine.suiza@student.lspu.edu.ph', studentNumber: '0424-4025' },
      { fullName: 'Marck Rafael B. De Leon', email: 'marckrafael.deleon@student.lspu.edu.ph', studentNumber: '0424-4026' }
    ]
  },
  {
    groupNumber: 9,
    name: 'Group 09',
    id: 'group-wmad3b-09',
    title: 'INTERACK: An Intelligent OJT Monitoring System with Camera-Based Attendance and Predictive Completion Analytics for Internship Management',
    adviser: FACULTY.SHERWIN_SAPIN,
    panelists: [
      { name: FACULTY.JONALYN_LABAYNE.name, id: FACULTY.JONALYN_LABAYNE.uid, role: 'Subject Specialist' },
      { name: FACULTY.JONARDO_ASOR.name, id: FACULTY.JONARDO_ASOR.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Wilmer Cabarrubias', email: 'wilmer.cabarrubias@student.lspu.edu.ph', studentNumber: '0424-4027' },
      { fullName: 'Brix Gloria', email: 'brix.gloria@student.lspu.edu.ph', studentNumber: '0424-4028' },
      { fullName: 'Andreine Tendencia', email: 'andreine.tendencia@student.lspu.edu.ph', studentNumber: '0424-4029' }
    ]
  },
  {
    groupNumber: 10,
    name: 'Group 10',
    id: 'group-wmad3b-10',
    title: 'Machine Learning Framework for Hallucination Level Detection and Prompt Optimization in Large Language Models',
    adviser: FACULTY.SHERWIN_SAPIN,
    panelists: [
      { name: FACULTY.JONARDO_ASOR.name, id: FACULTY.JONARDO_ASOR.uid, role: 'Subject Specialist' },
      { name: FACULTY.CAROLINA_JOVAL.name, id: FACULTY.CAROLINA_JOVAL.uid, role: 'Statistician' },
      { name: FACULTY.MYRA_PAICAGLINO.name, id: FACULTY.MYRA_PAICAGLINO.uid, role: 'Technical' }
    ],
    students: [
      { fullName: 'Michelle B. Labajo', email: 'michelle.labajo@student.lspu.edu.ph', studentNumber: '0424-4030' },
      { fullName: 'Jieshiel Kei L. Alvarado', email: 'jieshielkei.alvarado@student.lspu.edu.ph', studentNumber: '0424-4031' },
      { fullName: 'Margiedale Ann M. Morada', email: 'margiedaleann.morada@student.lspu.edu.ph', studentNumber: '0424-4032' }
    ]
  }
];

const defaultPassword = 'Student2026_LSPU!';
const academicYear = '2026-2027';
const semester = '1st';

async function provisionClassification({
  classificationName,
  courseId,
  courseName,
  programCode,
  specializationId,
  specialization,
  sectionId,
  sectionName,
  groupsData,
  allCredentials
}) {
  console.log(`\n================================================================`);
  console.log(` PROVISIONING: ${classificationName}`);
  console.log(` Course: ${courseName} (${courseId.toUpperCase()})`);
  console.log(` Specialization: ${specialization} (${specializationId.toUpperCase()})`);
  console.log(` Section: ${sectionName} (ID: ${sectionId})`);
  console.log(` Total Groups: ${groupsData.length}`);
  console.log(`================================================================`);

  // Ensure section exists and name is updated if needed
  await db.collection('sections').doc(sectionId).set({
    id: sectionId,
    name: sectionName,
    courseId,
    specializationId,
    active: true,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  for (const group of groupsData) {
    console.log(`\nProcessing ${classificationName} -> ${group.name}: "${group.title.substring(0, 50)}..."`);
    
    // 1. Process Students
    for (const student of group.students) {
      let uid = student.uid;
      const email = student.email.toLowerCase();

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
            classification: classificationName,
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

    // 3. Approved Proposal Record
    const proposalId = `prop-${group.id}`;
    const proposalDoc = {
      id: proposalId,
      groupId: group.id,
      groupName: group.name,
      title: group.title,
      description: `${specializationId.toUpperCase()} Capstone Research for ${group.name}.`,
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

    // 4. Manuscript Workspace Record
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
      researchDescription: `${specializationId.toUpperCase()} Capstone Research for ${group.name}.`,
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
}

async function main() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB.');

  // Clean up obsolete test groups in AMG Section A if any
  const obsoleteAMGIds = ['34YkZ86FBk1UK9N2aWaR', 'Yma2L8Wm3ZeN8k2pFEvt', 'ieYWCEbJqfdDySjNvxGb'];
  for (const oId of obsoleteAMGIds) {
    try {
      await db.collection('research_groups').doc(oId).delete();
      await db.collection('manuscript_workspaces').doc(`ws-${oId}`).delete();
      await MongoGroup.deleteOne({ id: oId });
      console.log(`Cleaned up obsolete test group: ${oId}`);
    } catch (e) {
      console.warn(`Note on cleanup of ${oId}:`, e.message);
    }
  }

  const allCredentials = [];

  // Classification A: BSIT AMG Section A (8 groups)
  await provisionClassification({
    classificationName: 'BSIT — AMG — Section A',
    courseId: 'bsit',
    courseName: 'Bachelor of Science in Information Technology',
    programCode: 'BSIT',
    specializationId: 'amg',
    specialization: 'Animation and Motion Graphics',
    sectionId: '3EvabSd3asHsUhBAMgGz',
    sectionName: 'A',
    groupsData: amgGroupsData,
    allCredentials
  });

  // Classification B: BSIT WMAD Section 3B (10 groups)
  await provisionClassification({
    classificationName: 'BSIT — WMAD — Section 3B',
    courseId: 'bsit',
    courseName: 'Bachelor of Science in Information Technology',
    programCode: 'BSIT',
    specializationId: 'wmad',
    specialization: 'Web and Mobile App Development',
    sectionId: 'mDUKksEOzqo839HzcSud',
    sectionName: '3B',
    groupsData: wmad3bGroupsData,
    allCredentials
  });

  // Save student credentials to file
  const credsPath = path.join(__dirname, 'amg_and_wmad3b_student_credentials.json');
  fs.writeFileSync(credsPath, JSON.stringify(allCredentials, null, 2));
  console.log(`\nAll newly created credentials saved to: ${credsPath}`);

  console.log('\n================================================================');
  console.log('   ALL 18 GROUPS & 56 STUDENT MEMBERS PROVISIONED SUCCESSFULLY');
  console.log('================================================================');
  process.exit(0);
}

main().catch(err => {
  console.error('FATAL PROVISIONING ERROR:', err);
  process.exit(1);
});
