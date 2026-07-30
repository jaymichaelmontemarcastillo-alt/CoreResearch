import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import api from './api';

/**
 * Interface definitions for lookup and template seeding
 */
export interface SeedResult {
  collectionName: string;
  documentsCreated: number;
  documentsSkipped: number;
  status: 'initialized' | 'already_seeded' | 'updated' | 'seeded_via_admin';
}

/**
 * 1. Lookup Collections Data Definition
 */

// Roles Lookup Data
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

// Departments Lookup Data
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

// Courses Lookup Data
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

// Research Categories Lookup Data
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

// Status Types Lookup Data
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

/**
 * 2. Operational Collections Template Documents
 */
const TEMPLATE_DOCUMENTS: Record<string, { id: string; data: Record<string, any> }> = {
  proposals: {
    id: '_template_proposal',
    data: {
      _isTemplate: true,
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
    }
  },
  research_projects: {
    id: '_template_project',
    data: {
      _isTemplate: true,
      proposalId: '_template_proposal',
      title: 'Template Research Project',
      studentId: '_template_student',
      adviserId: '_template_adviser',
      panelistIds: ['_template_panelist_1', '_template_panelist_2', '_template_panelist_3'],
      status: 'in_progress',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  },
  manuscript_versions: {
    id: '_template_manuscript',
    data: {
      _isTemplate: true,
      projectId: '_template_project',
      versionNumber: 'v1.0',
      fileUrl: '',
      fileName: 'template_manuscript_v1.0.pdf',
      fileSize: 0,
      uploadedBy: '_template_student',
      commentsCount: 0,
      status: 'under_review',
      createdAt: new Date().toISOString()
    }
  },
  evaluations: {
    id: '_template_evaluation',
    data: {
      _isTemplate: true,
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
    }
  },
  schedules: {
    id: '_template_schedule',
    data: {
      _isTemplate: true,
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
    }
  },
  notifications: {
    id: '_template_notification',
    data: {
      _isTemplate: true,
      userId: '_template_user',
      title: 'Welcome to CoreResearch',
      message: 'System initialization notification template.',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString()
    }
  },
  repository: {
    id: '_template_repository',
    data: {
      _isTemplate: true,
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
    }
  },
  reviews: {
    id: '_template_review',
    data: {
      _isTemplate: true,
      manuscriptId: '_template_manuscript',
      reviewerId: '_template_adviser',
      reviewerName: 'Template Reviewer',
      comment: 'Initial template review comment.',
      chapterSection: 'Abstract & Introduction',
      createdAt: new Date().toISOString()
    }
  }
};

/**
 * Generic Idempotent Seeder function
 */
async function seedCollection(
  collectionName: string,
  documents: Array<{ id: string; [key: string]: any }>
): Promise<SeedResult> {
  console.log(`\n⏳ Checking collection: '${collectionName}'...`);
  let createdCount = 0;
  let skippedCount = 0;

  for (const docItem of documents) {
    const { id, ...docData } = docItem;
    const docRef = doc(db, collectionName, id);

    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, { id, ...docData }, { merge: true });
        console.log(`  ➕ Added [${collectionName}]: ID = '${id}'`);
        createdCount++;
      } else {
        await setDoc(docRef, { id, ...docData }, { merge: true });
        console.log(`  ✓ Already exists (merged) [${collectionName}]: ID = '${id}'`);
        skippedCount++;
      }
    } catch (err: any) {
      console.warn(`  ⚠️ Client permission restriction on [${collectionName}/${id}]:`, err.message || err);
      throw err; // Re-throw to trigger Admin API fallback
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
 * Main Seeder Script Execution Entry Point
 */
export async function seedFirestoreDatabase(): Promise<SeedResult[]> {
  console.log('====================================================');
  console.log('🚀 Starting Firestore Database Initialization...');
  console.log('⚠️ Existing `users` collection will NOT be modified.');
  console.log('====================================================');

  try {
    const summaryResults: SeedResult[] = [];

    // 1. Seed Lookup Collections with Meaningful Fixed IDs
    summaryResults.push(await seedCollection('roles', ROLES_DATA));
    summaryResults.push(await seedCollection('departments', DEPARTMENTS_DATA));
    summaryResults.push(await seedCollection('courses', COURSES_DATA));
    summaryResults.push(await seedCollection('research_categories', RESEARCH_CATEGORIES_DATA));
    summaryResults.push(await seedCollection('status_types', STATUS_TYPES_DATA));

    // 2. Initialize Operational Collections with Single Template Documents
    for (const [colName, templateInfo] of Object.entries(TEMPLATE_DOCUMENTS)) {
      summaryResults.push(await seedCollection(colName, [{ id: templateInfo.id, ...templateInfo.data }]));
    }

    printSummary(summaryResults);
    return summaryResults;
  } catch (error) {
    console.warn('\n⚠️ Unauthenticated client SDK detected permission constraints.');
    console.log('🔄 Delegating database initialization to Backend Admin API endpoint...');

    try {
      const response = await api.post('/auth/seed-db');
      if (response.data && response.data.data) {
        console.log('\n====================================================');
        console.log('✅ Admin API Database Initialization Completed Successfully!');
        console.log('====================================================');
        return response.data.data;
      }
    } catch (apiErr: any) {
      console.error('❌ Admin API seeding error:', apiErr.message || apiErr);
    }
    return [];
  }
}

function printSummary(summaryResults: SeedResult[]) {
  console.log('\n====================================================');
  console.log('📋 FIRESTORE SEEDING EXECUTION SUMMARY');
  console.log('====================================================');
  console.table(
    summaryResults.map((res) => ({
      'Collection': res.collectionName,
      'Documents Added': res.documentsCreated,
      'Documents Preserved': res.documentsSkipped,
      'Status': res.status.toUpperCase()
    }))
  );
  console.log('====================================================');
  console.log('✅ Firestore Database initialization complete!');
  console.log('🎉 Ready for Phase 1 - Title Proposal Module development.');
  console.log('====================================================');
}

// Auto-run if executed directly in browser
if (typeof window !== 'undefined') {
  (window as any).seedFirestoreDatabase = seedFirestoreDatabase;
}

export default seedFirestoreDatabase;
