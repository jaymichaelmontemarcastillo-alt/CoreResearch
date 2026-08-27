import { db } from '../config/firebaseAdmin.js';
import crypto from 'crypto';

const rawData = [
  {
    students: ["Jynn Diane M. Casili", "Mirah Stephanie P. Lim", "Timothy Adriel Fernandez"],
    title: "AksyonNa: Machine Learning-Driven System for Efficient LGU Issue Reporting and Desk Management",
    adviser: "Jocelyn O. Padallan",
    subjectSpecialist: "Mike Philip T. Ramos",
    statistician: "Carolina R. Joval",
    technical: "Myra V. Paicaglino"
  },
  {
    students: ["Jay Michael Castillo", "John Paul Empalmado", "Chester Mendoza"],
    title: "CoreResearch: A hybrid Research Management System Utilizing Natural Language Processing Integration and Data Visualization for Manuscript Monitoring, Revision, Grading, and Research Scheduling",
    adviser: "Alejandro V. Matute Jr.",
    subjectSpecialist: "Maribel V. Cardona",
    statistician: "Dr. Sherwin B. Sapin",
    technical: "Myra V. Paicaglino"
  },
  {
    students: ["Ivan Angelo S. Cano", "Justine P. Castanar", "Allana C. Macatuno"],
    title: "ProjectBundok: A Web-Based Visitor Management System for Mount Kalisungan of Calauan, Laguna Integrating Machine Learning for Trail Mapping and Location Tracking",
    adviser: "Dr. Loyd S. Echalar",
    subjectSpecialist: "Gene Marck B. Catedrilla",
    statistician: "Jonardo R. Asor",
    technical: "Jocelyn O. Padallan"
  },
  {
    students: ["Alexandra Nicole Blasco", "Rondale Angelo Magda", "Fiona A. Sanchez"],
    title: "Development Of A Hybrid Automated Assessment Application Utilizing Optical Character Recognition And Natural Language Processing",
    adviser: "Alejandro V. Matute Jr.",
    subjectSpecialist: "Dr. Crisanto F. Gulay",
    statistician: "Carolina R. Joval",
    technical: "Jhoco S. Millanes"
  },
  {
    students: ["Cjay S. Melante", "Paulo David V. Romero", "John Paul E. Malabanan"],
    title: "CampusDrive: A Web-Based Vehicle Information Management System with Anti-Fraud Sticker Verification using Automated Visual Recognition",
    adviser: "Dr. Crisanto F. Gulay",
    subjectSpecialist: "Jefferson L. Lerios",
    statistician: "Dr. Sherwin B. Sapin",
    technical: "Jhoco S. Millanes"
  },
  {
    students: ["Lawrence Salvador", "Jeric Manibog", "Daryl Lapitan"],
    title: "SkillBridge: A Web and Mobile Platform for Skill-Based Micro-Internship Matching for Students",
    adviser: "Dr. Crisanto F. Gulay",
    subjectSpecialist: "Jonalyn Joy B. Labayne",
    statistician: "Carolina R. Joval",
    technical: "Myra V. Paicaglino"
  },
  {
    students: ["Carl Leinard C. Larga", "Clark Louie A. Desepida", "Sean Deaniel A. Garcia"],
    title: "INTELLISCHED: A Web Based Class Academic Scheduling System Utilizing Genetic Algorithm For Conflict Detection and Optimization",
    adviser: "Dr. Loyd S. Echalar",
    subjectSpecialist: "Gene Marck B. Catedrilla",
    statistician: "Dr. Sherwin B. Sapin",
    technical: "Myra V. Paicaglino"
  },
  {
    students: ["Danielle Linga", "John Royce Esporlas", "Jared nate Odian"],
    title: "DepEd Aral Program App",
    adviser: "Dr. Loyd S. Echalar",
    subjectSpecialist: "Mike Philip T. Ramos",
    statistician: "Carolina R. Joval",
    technical: "Jocelyn O. Padallan"
  },
  {
    students: ["Bryan Manera", "Raiza Jonelle Gacer", "Renz Gallego"],
    title: "Enhancing Operational Efficiency and Resource Management in Optical Clinic Utilizing Supervised Machine Learning Frameworks",
    adviser: "Dr. Crisanto F. Gulay",
    subjectSpecialist: "Alejandro V. Matute Jr.",
    statistician: "Carolina R. Joval",
    technical: "Jocelyn O. Padallan"
  },
  {
    students: ["Dave Soriano", "Laurence Bren Austria", "RickVon Borromeo Aragon", "Kenneth Brylle Nañez"],
    title: "Development of an IoT-Based Gas Monitoring and Early Warning System for Dumpsite Hazard Detection",
    adviser: "Dr. Crisanto F. Gulay",
    subjectSpecialist: "Myline V. Aquilo",
    statistician: "Dr. Sherwin B. Sapin",
    technical: "Myra O. Paicaglino"
  }
];

async function insertMockData() {
  console.log('Inserting mockup data...');
  
  const courseId = 'bsit';
  const courseName = 'BSIT';
  const sectionId = 'mIhskjSATV5amvcwZ35J'; // BSIT WMAD A
  const sectionName = 'A';
  
  let groupIndex = 11; // start from Group 11 to avoid collision with existing groups

  for (const item of rawData) {
    const groupId = db.collection('research_groups').doc().id;
    const groupName = `Group ${groupIndex.toString().padStart(2, '0')} (Mock)`;
    
    // Create members
    const members = item.students.map((studentName, i) => {
      return {
        uid: crypto.randomBytes(14).toString('hex'), // Mock UID
        fullName: studentName,
        email: `${studentName.toLowerCase().replace(/[^a-z]/g, '')}@student.lspu.edu.ph`
      };
    });
    
    // Create panelists array
    const panelists = [
      { name: item.subjectSpecialist, role: 'Subject Specialist', id: crypto.randomBytes(14).toString('hex') },
      { name: item.statistician, role: 'Statistician', id: crypto.randomBytes(14).toString('hex') },
      { name: item.technical, role: 'Technical', id: crypto.randomBytes(14).toString('hex') }
    ];

    const groupDoc = {
      id: groupId,
      name: groupName,
      courseId,
      courseName,
      sectionId,
      sectionName,
      memberIds: members.map(m => m.uid),
      members: members,
      status: 'ready',
      adviserName: item.adviser,
      adviserId: crypto.randomBytes(14).toString('hex'),
      panelists: panelists,
      isMockup: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Insert Group
    await db.collection('research_groups').doc(groupId).set(groupDoc);
    
    // Create Proposal (Title)
    const proposalId = db.collection('proposals').doc().id;
    const proposalDoc = {
      id: proposalId,
      title: item.title,
      description: 'Mockup proposal inserted for testing scheduling.',
      groupId: groupId,
      groupName: groupName,
      courseId,
      courseName,
      sectionId,
      sectionName,
      status: 'approved', // Approved so it shows up in scheduling usually
      submittedByUid: members[0].uid,
      submittedByName: members[0].fullName,
      isMockup: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('proposals').doc(proposalId).set(proposalDoc);
    
    console.log(`Inserted ${groupName}: ${item.title}`);
    groupIndex++;
  }
  
  console.log('Finished inserting mockup data!');
}

insertMockData().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
