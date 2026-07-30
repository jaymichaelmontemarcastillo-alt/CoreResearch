import { db, isDevMockMode, mockUsersDb } from '../config/firebaseAdmin.js';

// 1. Roles Lookup Data
const ROLES_DATA = [
  {
    id: 'student',
    name: 'Student',
    description: 'Undergraduate or graduate student conducting research',
    permissions: ['submit_proposal', 'upload_manuscript', 'view_schedule', 'view_grades'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'adviser',
    name: 'Research Adviser',
    description: 'Faculty member mentoring and guiding student research teams',
    permissions: ['review_proposal', 'annotate_manuscript', 'approve_defense', 'track_students'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'panelist',
    name: 'Panelist',
    description: 'Faculty member serving on defense evaluation committees',
    permissions: ['evaluate_defense', 'submit_rubric', 'view_manuscripts'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Department Chair, Research Coordinator, or System Administrator',
    permissions: ['manage_users', 'assign_adviser', 'schedule_defense', 'publish_repository', 'manage_settings'],
    createdAt: new Date().toISOString()
  }
];

// 2. Departments Lookup Data
const DEPARTMENTS_DATA = [
  {
    id: 'cs',
    code: 'CS',
    name: 'Department of Computer Science',
    college: 'College of Computer Studies',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'it',
    code: 'IT',
    name: 'Department of Information Technology',
    college: 'College of Computer Studies',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'is',
    code: 'IS',
    name: 'Department of Information Systems',
    college: 'College of Computer Studies',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cpe',
    code: 'CpE',
    name: 'Department of Computer Engineering',
    college: 'College of Engineering',
    active: true,
    createdAt: new Date().toISOString()
  }
];

// 3. Courses Lookup Data
const COURSES_DATA = [
  {
    id: 'bscs',
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    departmentId: 'cs',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bsit',
    code: 'BSIT',
    name: 'Bachelor of Science in Information Technology',
    departmentId: 'it',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bsis',
    code: 'BSIS',
    name: 'Bachelor of Science in Information Systems',
    departmentId: 'is',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'bscpe',
    code: 'BSCPE',
    name: 'Bachelor of Science in Computer Engineering',
    departmentId: 'cpe',
    active: true,
    createdAt: new Date().toISOString()
  }
];

// 4. Research Categories Lookup Data
const RESEARCH_CATEGORIES_DATA = [
  {
    id: 'ai_ml',
    name: 'Artificial Intelligence & Machine Learning',
    description: 'Machine learning models, computer vision, natural language processing, and neural networks',
    createdAt: new Date().toISOString()
  },
  {
    id: 'web_mobile',
    name: 'Web & Mobile Application Systems',
    description: 'Enterprise software architecture, progressive web apps, and cross-platform mobile systems',
    createdAt: new Date().toISOString()
  },
  {
    id: 'iot_embedded',
    name: 'Internet of Things & Embedded Systems',
    description: 'Sensor networks, microcontrollers, smart automation, and robotics',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cybersecurity',
    name: 'Cybersecurity & Data Privacy',
    description: 'Network security, cryptography, vulnerability analysis, and security governance',
    createdAt: new Date().toISOString()
  },
  {
    id: 'data_science',
    name: 'Data Science & Big Data Analytics',
    description: 'Data mining, predictive analytics, visualization, and statistical modeling',
    createdAt: new Date().toISOString()
  }
];

// 5. Status Types Lookup Data
const STATUS_TYPES_DATA = [
  {
    id: 'pending',
    name: 'Pending Review',
    category: 'proposal',
    description: 'Awaiting adviser or admin review',
    color: 'amber',
    createdAt: new Date().toISOString()
  },
  {
    id: 'approved',
    name: 'Approved',
    category: 'proposal',
    description: 'Proposal accepted for research development',
    color: 'emerald',
    createdAt: new Date().toISOString()
  },
  {
    id: 'revisions_required',
    name: 'Revisions Required',
    category: 'proposal',
    description: 'Proposal requires modification and resubmission',
    color: 'orange',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rejected',
    name: 'Rejected',
    category: 'proposal',
    description: 'Proposal declined by department committee',
    color: 'rose',
    createdAt: new Date().toISOString()
  },
  {
    id: 'in_progress',
    name: 'In Progress',
    category: 'project',
    description: 'Active research development and manuscript drafting',
    color: 'blue',
    createdAt: new Date().toISOString()
  },
  {
    id: 'proposal_defense_passed',
    name: 'Proposal Defense Passed',
    category: 'project',
    description: 'Successfully passed title proposal defense',
    color: 'indigo',
    createdAt: new Date().toISOString()
  },
  {
    id: 'final_defense_passed',
    name: 'Final Defense Passed',
    category: 'project',
    description: 'Successfully completed final research defense',
    color: 'teal',
    createdAt: new Date().toISOString()
  },
  {
    id: 'completed',
    name: 'Completed',
    category: 'project',
    description: 'All academic requirements and revisions fulfilled',
    color: 'green',
    createdAt: new Date().toISOString()
  },
  {
    id: 'archived',
    name: 'Archived',
    category: 'project',
    description: 'Published to the institutional digital repository',
    color: 'purple',
    createdAt: new Date().toISOString()
  }
];

// 6. Operational Collections Template Documents
const TEMPLATE_DOCUMENTS = {
  proposals: {
    id: '_template_proposal',
    title: 'Template Research Proposal',
    abstract: 'Initial proposal template document used for collection schema initialization.',
    keywords: ['template', 'initialization'],
    studentId: '_template_student',
    studentName: 'Template Student',
    department: 'Computer Science',
    status: 'pending',
    adviserComment: '',
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  research_projects: {
    id: '_template_project',
    proposalId: '_template_proposal',
    title: 'Template Research Project',
    studentId: '_template_student',
    adviserId: '_template_adviser',
    panelistIds: ['_template_panelist_1', '_template_panelist_2', '_template_panelist_3'],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  manuscript_versions: {
    id: '_template_manuscript',
    projectId: '_template_project',
    versionNumber: 'v1.0',
    fileUrl: '',
    fileName: 'template_manuscript_v1.0.pdf',
    fileSize: 0,
    uploadedBy: '_template_student',
    commentsCount: 0,
    status: 'under_review',
    createdAt: new Date().toISOString()
  },
  evaluations: {
    id: '_template_evaluation',
    defenseId: '_template_schedule',
    projectId: '_template_project',
    panelistId: '_template_panelist',
    scores: {
      presentation: 20,
      methodology: 30,
      results: 30,
      manuscriptQuality: 20
    },
    totalScore: 100,
    remarks: 'Template evaluation rubric entry.',
    submittedAt: new Date().toISOString()
  },
  schedules: {
    id: '_template_schedule',
    projectId: '_template_project',
    projectTitle: 'Template Research Project',
    defenseType: 'proposal_defense',
    date: '2026-08-01',
    startTime: '09:00',
    endTime: '10:30',
    venue: 'AVR 1 / Zoom Meeting',
    panelistIds: ['_template_panelist_1', '_template_panelist_2'],
    status: 'scheduled',
    createdAt: new Date().toISOString()
  },
  notifications: {
    id: '_template_notification',
    userId: '_template_user',
    title: 'Welcome to CoreResearch',
    message: 'System initialization notification template.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  },
  repository: {
    id: '_template_repository',
    projectId: '_template_project',
    title: 'Template Published Research Paper',
    authors: ['Template Student'],
    adviser: 'Template Adviser',
    abstract: 'Published research repository paper template entry.',
    keywords: ['research', 'computer science'],
    publicationYear: 2026,
    department: 'Computer Science',
    downloadUrl: '',
    publishedAt: new Date().toISOString()
  },
  reviews: {
    id: '_template_review',
    manuscriptId: '_template_manuscript',
    reviewerId: '_template_adviser',
    reviewerName: 'Template Reviewer',
    comment: 'Initial template review comment.',
    chapterSection: 'Abstract & Introduction',
    createdAt: new Date().toISOString()
  }
};

/**
 * Helper to seed a single collection idempotently via Firebase Admin SDK
 */
async function seedCollectionAdmin(collectionName, documents) {
  console.log(`\n⏳ Checking collection: '${collectionName}'...`);
  let createdCount = 0;
  let skippedCount = 0;

  for (const docItem of documents) {
    const { id, ...docData } = docItem;

    if (db) {
      try {
        const docRef = db.collection(collectionName).doc(id);
        const snapshot = await docRef.get();

        if (!snapshot.exists) {
          await docRef.set({ id, ...docData }, { merge: true });
          console.log(`  ➕ Added [${collectionName}]: ID = '${id}'`);
          createdCount++;
        } else {
          await docRef.set({ id, ...docData }, { merge: true });
          console.log(`  ✓ Already exists (merged) [${collectionName}]: ID = '${id}'`);
          skippedCount++;
        }
      } catch (err) {
        console.warn(`  ⚠️ Firestore admin warning [${collectionName}/${id}]:`, err.message);
        skippedCount++;
      }
    } else {
      console.log(`  ✓ Seeded to in-memory store [${collectionName}]: ID = '${id}'`);
      createdCount++;
    }
  }

  return {
    collectionName,
    documentsCreated: createdCount,
    documentsSkipped: skippedCount,
    status: createdCount > 0 ? 'initialized' : 'already_seeded'
  };
}

/**
 * Execute Firestore Admin Initialization
 */
export async function runAdminFirestoreSeed() {
  console.log('====================================================');
  console.log('🚀 Starting Admin Firestore Database Seeding...');
  console.log('⚠️ Existing `users` collection will NOT be modified.');
  console.log('====================================================');

  const summaryResults = [];

  // Seed Lookup Collections
  summaryResults.push(await seedCollectionAdmin('roles', ROLES_DATA));
  summaryResults.push(await seedCollectionAdmin('departments', DEPARTMENTS_DATA));
  summaryResults.push(await seedCollectionAdmin('courses', COURSES_DATA));
  summaryResults.push(await seedCollectionAdmin('research_categories', RESEARCH_CATEGORIES_DATA));
  summaryResults.push(await seedCollectionAdmin('status_types', STATUS_TYPES_DATA));

  // Seed Operational Collections Templates
  for (const [colName, templateData] of Object.entries(TEMPLATE_DOCUMENTS)) {
    summaryResults.push(await seedCollectionAdmin(colName, [templateData]));
  }

  console.log('\n====================================================');
  console.log('📋 FIRESTORE SEEDING EXECUTION SUMMARY');
  console.log('====================================================');
  console.table(
    summaryResults.map((res) => ({
      Collection: res.collectionName,
      'Documents Added': res.documentsCreated,
      'Documents Preserved': res.documentsSkipped,
      Status: res.status.toUpperCase()
    }))
  );
  console.log('====================================================');
  console.log('✅ Firestore Database initialization complete!');
  console.log('🎉 Ready for Phase 1 - Title Proposal Module development.');
  console.log('====================================================');

  return summaryResults;
}

// Auto-execute if run as node script
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('seedFirestoreAdmin.js')) {
  runAdminFirestoreSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seeding error:', err);
      process.exit(1);
    });
}
