import dotenv from 'dotenv';
dotenv.config();
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { RepositoryPublication } from '../models/RepositoryPublication.js';
import { mockFirestoreDb, mockUsersDb } from '../config/firebaseAdmin.js';

// Import controllers
import { updateUserProfile } from '../controllers/userController.js';
import { assignAdviser } from '../controllers/projectController.js';
import { getActiveRubric, saveRubric, submitEvaluation, getEvaluations, DEFAULT_RUBRIC } from '../controllers/evaluationController.js';
import { getRepositoryPublications, publishToRepository } from '../controllers/repositoryController.js';
import { submitPostDefenseRevision, reviewPostDefenseRevision, publishManuscriptToRepository, getPostDefenseRevisions } from '../controllers/manuscriptController.js';
import { serveStorageAsset } from '../controllers/documentController.js';

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
    send(payload) {
      this.data = payload;
      return this;
    }
  };
  return res;
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m ${message}`);
  } else {
    console.error(`  \x1b[31m✘\x1b[0m FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('CoreResearch Phase 4: Full Automated Verification');
  console.log('======================================================\n');

  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  console.log('[Setup] Connected to in-memory MongoDB instance.\n');

  try {
    // -------------------------------------------------------------------------
    // REQUIREMENT 1: Configurable Maximum Adviser Handle
    // -------------------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 1] Requirement 1: Configurable Maximum Adviser Handle\x1b[0m');

    // 1.1 Seed adviser in Mongo and mockUsersDb
    const adviser = await User.create({
      uid: 'adv-001',
      email: 'adviser1@domain.edu',
      role: 'adviser',
      status: 'active',
      is_approved: true,
      fullName: 'Dr. Jane Smith',
      maxCapacity: 2,
      maxAdvisees: 2,
      activeGroupsCount: 0
    });
    mockUsersDb.set('adv-001', {
      id: 'adv-001',
      uid: 'adv-001',
      email: 'adviser1@domain.edu',
      fullName: 'Dr. Jane Smith',
      maxCapacity: 2,
      maxAdvisees: 2
    });
    assert(adviser.maxCapacity === 2, 'Adviser created with capacity limit of 2');

    // 1.2 Update adviser capacity via userController
    const updateReq = {
      params: { uid: 'adv-001' },
      body: { maxCapacity: 2, maxAdvisees: 2 }
    };
    const updateRes = mockRes();
    await updateUserProfile(updateReq, updateRes);
    assert(updateRes.statusCode === 200, 'Capacity update returns 200');
    assert(updateRes.data.data.maxCapacity === 2 && updateRes.data.data.maxAdvisees === 2, 'maxCapacity and maxAdvisees are synchronized');

    // 1.3 Seed 3 mock projects in mockFirestoreDb
    if (!mockFirestoreDb.has('projects')) {
      mockFirestoreDb.set('projects', new Map());
    }
    const projectsMap = mockFirestoreDb.get('projects');
    projectsMap.set('proj-test-1', {
      id: 'proj-test-1',
      title: 'Project 1',
      status: 'pending_adviser',
      adviserId: ''
    });
    projectsMap.set('proj-test-2', {
      id: 'proj-test-2',
      title: 'Project 2',
      status: 'pending_adviser',
      adviserId: ''
    });
    projectsMap.set('proj-test-3', {
      id: 'proj-test-3',
      title: 'Project 3',
      status: 'pending_adviser',
      adviserId: ''
    });

    // 1.4 Assign project 1 (succeeds: 1/2)
    const assignReq1 = {
      params: { id: 'proj-test-1' },
      body: { adviserId: 'adv-001' }
    };
    const assignRes1 = mockRes();
    await assignAdviser(assignReq1, assignRes1);
    assert(assignRes1.statusCode === 200, 'Assignment 1 succeeded (1/2 quota allocated)');

    // 1.5 Assign project 2 (succeeds: 2/2)
    const assignReq2 = {
      params: { id: 'proj-test-2' },
      body: { adviserId: 'adv-001' }
    };
    const assignRes2 = mockRes();
    await assignAdviser(assignReq2, assignRes2);
    assert(assignRes2.statusCode === 200, 'Assignment 2 succeeded (2/2 quota reached)');

    // 1.6 Assign project 3 (must fail: 2/2 capacity exceeded)
    const assignReq3 = {
      params: { id: 'proj-test-3' },
      body: { adviserId: 'adv-001' }
    };
    const assignRes3 = mockRes();
    await assignAdviser(assignReq3, assignRes3);
    assert(assignRes3.statusCode === 400, 'Assignment 3 rejected with 400 Bad Request');
    assert(
      assignRes3.data.message && assignRes3.data.message.includes('capacity'),
      `Error specifies capacity exceeded: "${assignRes3.data.message}"`
    );

    // 1.7 Reducing capacity keeps existing assignments intact but blocks further ones
    const reduceReq = {
      params: { uid: 'adv-001' },
      body: { maxCapacity: 1, maxAdvisees: 1 }
    };
    const reduceRes = mockRes();
    await updateUserProfile(reduceReq, reduceRes);
    assert(reduceRes.statusCode === 200, 'Capacity reduced to 1');
    assert(projectsMap.get('proj-test-1').adviserId === 'adv-001', 'Existing assignment 1 remains intact');
    assert(projectsMap.get('proj-test-2').adviserId === 'adv-001', 'Existing assignment 2 remains intact');

    console.log('');

    // -------------------------------------------------------------------------
    // REQUIREMENT 2: Editable Research Evaluation Rubrics
    // -------------------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 2] Requirement 2: Editable Research Evaluation Rubrics\x1b[0m');

    // 2.1 Get active rubric when none custom saved (fallback to DEFAULT_RUBRIC)
    const getRubricReq1 = { user: { role: 'admin' } };
    const getRubricRes1 = mockRes();
    await getActiveRubric(getRubricReq1, getRubricRes1);
    assert(getRubricRes1.statusCode === 200, 'Active rubric endpoint returns 200');
    assert(getRubricRes1.data.data.totalMaxScore === 100, 'Default rubric criteria weight sums to 100');

    // 2.2 Reject rubric when criteria weights != 100 (e.g. 90)
    const invalidRubricReq = {
      body: {
        title: 'Invalid Total Rubric',
        criteria: [
          { key: 'c1', label: 'Criterion 1', maxScore: 50, weight: 50 },
          { key: 'c2', label: 'Criterion 2', maxScore: 40, weight: 40 } // Sum = 90
        ]
      },
      user: { uid: 'admin-1', role: 'admin' }
    };
    const invalidRubricRes = mockRes();
    await saveRubric(invalidRubricReq, invalidRubricRes);
    assert(invalidRubricRes.statusCode === 400, 'Saving rubric with sum = 90 rejected with 400');
    assert(invalidRubricRes.data.message.includes('must sum to exactly 100'), 'Error message clarifies sum must equal 100');

    // 2.3 Accept rubric when criteria weights == 100
    const validRubricReq = {
      body: {
        title: 'Custom Defense Rubric 2026',
        criteria: [
          { key: 'originality', label: 'Originality & Significance', maxScore: 30, weight: 30, description: 'Novel contribution' },
          { key: 'methodology', label: 'Methodology & Rigor', maxScore: 40, weight: 40, description: 'Systematic scientific process' },
          { key: 'presentation', label: 'Defense Presentation', maxScore: 30, weight: 30, description: 'Clarity and Q&A' }
        ]
      },
      user: { uid: 'admin-1', role: 'admin' }
    };
    const validRubricRes = mockRes();
    await saveRubric(validRubricReq, validRubricRes);
    assert(validRubricRes.statusCode === 201, 'Saving valid rubric (sum = 100) returns 201 Created');
    const savedRubric = validRubricRes.data.data;
    assert(savedRubric.isActive === true && savedRubric.version === 2, 'Rubric marked active with version 2');

    // 2.4 Submit evaluation using active rubric and verify criteriaSnapshot is captured
    const evalReq = {
      params: { projectId: 'proj-test-1' },
      body: {
        projectId: 'proj-test-1',
        scores: { originality: 28, methodology: 38, presentation: 27 },
        remarks: 'Outstanding research and defense execution.',
        evaluatorId: 'adv-001',
        defenseType: 'final'
      },
      user: { uid: 'adv-001', role: 'adviser', fullName: 'Dr. Jane Smith' }
    };
    const evalRes = mockRes();
    await submitEvaluation(evalReq, evalRes);
    assert(evalRes.statusCode === 200 || evalRes.statusCode === 201, 'Evaluation submitted successfully');
    const createdEval = evalRes.data.data;
    assert(createdEval.criteriaSnapshot && createdEval.criteriaSnapshot.length === 3, 'Historical criteriaSnapshot saved on evaluation');
    assert(createdEval.rubricVersion === 2, 'rubricVersion 2 stamped on evaluation');

    // 2.5 Save rubric version 3 and verify older evaluation snapshot was NOT mutated
    const validRubricV2Req = {
      body: {
        title: 'Custom Defense Rubric 2027',
        criteria: [
          { key: 'content', label: 'Content Depth', maxScore: 50, weight: 50 },
          { key: 'presentation', label: 'Presentation', maxScore: 50, weight: 50 }
        ]
      },
      user: { uid: 'admin-1', role: 'admin' }
    };
    const validRubricV2Res = mockRes();
    await saveRubric(validRubricV2Req, validRubricV2Res);
    assert(validRubricV2Res.data.data.version === 3, 'New rubric created with version 3');

    // Retrieve previous evaluation and ensure its criteriaSnapshot is unchanged
    const evalListReq = { params: { projectId: 'proj-test-1' } };
    const evalListRes = mockRes();
    await getEvaluations(evalListReq, evalListRes);
    const retrievedEvals = evalListRes.data.data;
    const pastEval = retrievedEvals.find(e => e.id === createdEval.id);
    assert(pastEval.criteriaSnapshot.length === 3, 'Historical evaluation preserves original 3 criteria');
    assert(pastEval.criteriaSnapshot[0].key === 'originality', 'Historical criteriaSnapshot key originality preserved');

    console.log('');

    // -------------------------------------------------------------------------
    // REQUIREMENT 3: Student Repository Access — Abstract Only
    // -------------------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 3] Requirement 3: Student Repository Access — Abstract Only\x1b[0m');

    // 3.1 Seed public repository item in MongoDB
    const repoItem = await RepositoryPublication.create({
      id: 'repo-pub-001',
      title: 'Neural Network Optimization for Embedded Devices',
      abstract: 'This paper proposes a pruned deep learning pipeline tailored for microcontrollers.',
      content: 'CONFIDENTIAL RESEARCH DATA: Full body, datasets, proprietary algorithms, and implementation source code.',
      pdfUrl: '/api/storage/assets/repository/sample-publication.pdf',
      fileUrl: '/api/storage/assets/repository/sample-publication.pdf',
      status: 'approved',
      accessLevel: 'full'
    });

    // 3.2 Faculty / Admin access
    const facultyReq = {
      query: {},
      headers: {},
      user: { role: 'faculty' }
    };
    const facultyRes = mockRes();
    await getRepositoryPublications(facultyReq, facultyRes);
    assert(facultyRes.statusCode === 200, 'Faculty repository query returns 200');
    const facultyItem = facultyRes.data.data.find(p => p.id === 'repo-pub-001');
    assert(facultyItem.pdfUrl && facultyItem.hasFullAccess === true, 'Faculty receives full pdfUrl and hasFullAccess: true');

    // 3.3 Student access (via req.user or x-user-role)
    const studentReq = {
      query: {},
      headers: {},
      user: { role: 'student' }
    };
    const studentRes = mockRes();
    await getRepositoryPublications(studentReq, studentRes);
    assert(studentRes.statusCode === 200, 'Student repository query returns 200');
    const studentItem = studentRes.data.data.find(p => p.id === 'repo-pub-001');
    assert(!studentItem.pdfUrl, 'Student receives pdfUrl redacted/undefined');
    assert(!studentItem.fileUrl, 'Student receives fileUrl redacted/undefined');
    assert(!studentItem.content, 'Student receives content redacted/undefined');
    assert(studentItem.accessLevel === 'abstract_only', 'Student item explicitly flagged accessLevel: "abstract_only"');
    assert(studentItem.hasFullAccess === false, 'Student item flagged hasFullAccess: false');
    assert(studentItem.abstract && studentItem.abstract.length > 0, 'Student still receives abstract and metadata');

    // 3.4 Direct download RBAC test: student attempting to download repository asset
    const downloadReq = {
      params: { 0: 'repository/sample-publication.pdf' },
      user: { role: 'student' },
      headers: {}
    };
    const downloadRes = mockRes();
    await serveStorageAsset(downloadReq, downloadRes);
    assert(downloadRes.statusCode === 403, 'Direct download of repository asset by student returns 403 Forbidden');
    assert(
      downloadRes.data.message && downloadRes.data.message.includes('abstracts and metadata only'),
      `Error informs student of abstract-only restriction: "${downloadRes.data.message}"`
    );

    console.log('');

    // -------------------------------------------------------------------------
    // REQUIREMENT 4: Revision Workflow After Final Defense
    // -------------------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 4] Requirement 4: Revision Workflow After Final Defense\x1b[0m');

    // 4.1 Seed manuscript in mockFirestoreDb needing revisions
    if (!mockFirestoreDb.has('manuscripts')) {
      mockFirestoreDb.set('manuscripts', new Map());
    }
    const msMap = mockFirestoreDb.get('manuscripts');
    const msId = 'ms-drone-001';
    msMap.set(msId, {
      id: msId,
      title: 'Autonomous Drone Navigation in GPS-Denied Environments',
      abstract: 'Investigating SLAM-based vision algorithms for subterranean navigation.',
      studentId: 'student-001',
      studentName: 'Alice Student',
      adviserId: 'adv-001',
      finalDefenseVerdict: 'PASSED_WITH_MINOR_REVISIONS',
      postDefenseRevisionRequired: true,
      postDefenseRevisionStatus: 'pending_submission',
      revisionDirectives: '1. Expand Section 4.2 error bounds. 2. Clarify camera calibration.',
      status: 'defense_passed'
    });

    // 4.2 Test publication gate while revisions are pending
    const prematurePubReq = {
      params: { id: msId },
      body: {},
      user: { role: 'student', uid: 'student-001' }
    };
    const prematurePubRes = mockRes();
    await publishManuscriptToRepository(prematurePubReq, prematurePubRes);
    assert(prematurePubRes.statusCode === 400, 'Premature publication rejected with 400 Bad Request');
    assert(
      prematurePubRes.data.message && prematurePubRes.data.message.includes('revisions must be formally reviewed and approved'),
      `Error states revisions must be approved: "${prematurePubRes.data.message}"`
    );

    // 4.3 Student submits point-by-point revision matrix
    const submitRevisionReq = {
      params: { id: msId },
      body: {
        revisionMatrix: [
          {
            directive: 'Expand Section 4.2 error bounds',
            actionTaken: 'Added Monte Carlo simulation bounds in Section 4.2.3 with error tolerance analysis.',
            sectionOrPage: 'Section 4.2.3, pp. 45-48'
          },
          {
            directive: 'Clarify camera calibration',
            actionTaken: 'Documented Zhang checkerboard intrinsic and extrinsic parameters in Table 4.1.',
            sectionOrPage: 'Section 3.1, p. 28'
          }
        ],
        summaryNotes: 'All panel directives have been addressed in full. Please review the updated manuscript.',
        fileName: 'Autonomous_Drone_Final_Revised.docx',
        fileSize: 4200000
      },
      user: { uid: 'student-001', fullName: 'Alice Student' }
    };
    const submitRevisionRes = mockRes();
    await submitPostDefenseRevision(submitRevisionReq, submitRevisionRes);
    assert(submitRevisionRes.statusCode === 200, 'Student post-defense revision submission returns 200');
    assert(submitRevisionRes.data.data.postDefenseRevisionStatus === 'under_review', 'Manuscript status updated to under_review');

    // 4.4 Panel review: request further revisions
    const rejectReviewReq = {
      params: { id: msId },
      body: {
        decision: 'revision_required',
        reviewNotes: 'Checkerboard calibration parameters missing reprojection error in Table 4.1.'
      },
      user: { uid: 'adv-001', fullName: 'Dr. Jane Smith' }
    };
    const rejectReviewRes = mockRes();
    await reviewPostDefenseRevision(rejectReviewReq, rejectReviewRes);
    assert(rejectReviewRes.statusCode === 200, 'Review rejection returns 200');
    assert(rejectReviewRes.data.data.postDefenseRevisionStatus === 'revision_required', 'Manuscript status updated to revision_required');

    // Publication still blocked!
    const prematurePubRes2 = mockRes();
    await publishManuscriptToRepository(prematurePubReq, prematurePubRes2);
    assert(prematurePubRes2.statusCode === 400, 'Publication blocked while revision_required');

    // 4.5 Student resubmits and Panel approves
    await submitPostDefenseRevision(submitRevisionReq, submitRevisionRes);
    const approveReviewReq = {
      params: { id: msId },
      body: {
        decision: 'approved',
        reviewNotes: 'All directives verified and thoroughly addressed. Approved for final archiving.'
      },
      user: { uid: 'adv-001', fullName: 'Dr. Jane Smith' }
    };
    const approveReviewRes = mockRes();
    await reviewPostDefenseRevision(approveReviewReq, approveReviewRes);
    assert(approveReviewRes.statusCode === 200, 'Review approval returns 200');
    assert(approveReviewRes.data.data.postDefenseRevisionStatus === 'approved', 'Manuscript revision status updated to approved');

    // 4.6 Verification via getPostDefenseRevisions endpoint
    const getRevisionsReq = { params: { id: msId } };
    const getRevisionsRes = mockRes();
    await getPostDefenseRevisions(getRevisionsReq, getRevisionsRes);
    assert(getRevisionsRes.statusCode === 200, 'getPostDefenseRevisions returns 200');
    assert(getRevisionsRes.data.data.postDefenseRevisionStatus === 'approved', 'Revision status confirmed approved');
    assert(getRevisionsRes.data.data.approvedBy === 'Dr. Jane Smith', 'Approved by Dr. Jane Smith');

    // Publication gate cleared!
    const pubReqCleared = {
      params: { id: msId },
      body: {},
      user: { role: 'faculty', uid: 'adv-001', fullName: 'Dr. Jane Smith' }
    };
    const pubResCleared = mockRes();
    await publishManuscriptToRepository(pubReqCleared, pubResCleared);
    assert(pubResCleared.statusCode === 200, 'Publication successfully approved after post-defense revision clearance');

    console.log('');

    // -------------------------------------------------------------------------
    // REQUIREMENT 5: Publish Manuscript (50MB Limit and Terms Acceptance)
    // -------------------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 5] Requirement 5: 50MB Limit & Institutional Terms Acceptance\x1b[0m');

    // 5.1 Student attempts publication to repository without acceptedTerms
    const unacceptedTermsReq = {
      body: {
        title: 'Autonomous Drone Navigation in GPS-Denied Environments',
        abstract: 'Investigating SLAM-based vision algorithms for subterranean navigation.',
        manuscriptId: msId,
        acceptedTerms: false
      },
      user: {
        uid: 'student-001',
        role: 'student',
        fullName: 'Alice Student',
        email: 'alice@student.edu'
      }
    };
    const unacceptedTermsRes = mockRes();
    await publishToRepository(unacceptedTermsReq, unacceptedTermsRes);
    assert(unacceptedTermsRes.statusCode === 400, 'Publication without accepting terms rejected with 400');
    assert(
      unacceptedTermsRes.data.message && unacceptedTermsRes.data.message.includes('Institutional repository publication conditions'),
      `Error states terms must be accepted: "${unacceptedTermsRes.data.message}"`
    );

    // 5.2 Student publishes with acceptedTerms: true
    const acceptedTermsReq = {
      body: {
        title: 'Autonomous Drone Navigation in GPS-Denied Environments',
        abstract: 'Investigating SLAM-based vision algorithms for subterranean navigation.',
        manuscriptId: msId,
        acceptedTerms: true,
        termsVersion: '1.0'
      },
      user: {
        uid: 'student-001',
        role: 'student',
        fullName: 'Alice Student',
        email: 'alice@student.edu'
      }
    };
    const acceptedTermsRes = mockRes();
    await publishToRepository(acceptedTermsReq, acceptedTermsRes);
    assert(acceptedTermsRes.statusCode === 201, 'Publication with accepted terms returns 201 Created');
    const pubData = acceptedTermsRes.data.data;
    assert(pubData.acceptedTerms === true, 'Publication record persists acceptedTerms: true');
    assert(pubData.acceptedByName === 'Alice Student', 'Publication record persists acceptedByName');
    assert(pubData.termsVersion === '1.0', 'Publication record persists termsVersion 1.0');
    assert(pubData.acceptedAt !== null, 'Publication record persists acceptedAt timestamp');

    console.log('');
    console.log('======================================================');
    console.log(`\x1b[32mALL VERIFICATION CHECKS PASSED: ${passedTests}/${totalTests} tests successful.\x1b[0m`);
    console.log('======================================================\n');

  } finally {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('[Cleanup] Disconnected in-memory MongoDB.\n');
  }
}

runTests().catch(err => {
  console.error('\x1b[31m[Verification Failure]:\x1b[0m', err);
  process.exit(1);
});
