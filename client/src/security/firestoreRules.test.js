import { readFileSync } from 'node:fs';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

let testEnv;
vi.setConfig({ testTimeout: 20000, hookTimeout: 60000 });

const approvedProfile = (role = 'student') => ({
  uid: role,
  role,
  role_id: role,
  status: 'active',
  is_approved: true,
});

const seed = async (documents) => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(
      documents.map(({ path, data }) => setDoc(doc(db, path), data))
    );
  });
};

describe('Firestore security rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'coreresearch-33a17',
      firestore: {
        rules: readFileSync(new URL('../../../firestore.rules', import.meta.url), 'utf8'),
      },
    });
  }, 60000);

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('prevents users from escalating their own role or reading other profiles while pending', async () => {
    await seed([
      {
        path: 'users/student-1',
        data: { ...approvedProfile(), uid: 'student-1' },
      },
      {
        path: 'users/student-2',
        data: { ...approvedProfile(), uid: 'student-2' },
      },
      {
        path: 'users/pending-1',
        data: {
          uid: 'pending-1',
          role: 'student',
          role_id: 'student',
          status: 'pending',
          is_approved: false,
        },
      },
    ]);

    const studentDb = testEnv.authenticatedContext('student-1').firestore();
    await assertFails(updateDoc(doc(studentDb, 'users/student-1'), {
      role: 'admin',
      role_id: 'admin',
      status: 'active',
      is_approved: true,
    }));

    const pendingDb = testEnv.authenticatedContext('pending-1').firestore();
    await assertFails(getDoc(doc(pendingDb, 'users/student-2')));
  });

  it('allows group membership only through a pending invitation accepted by its invitee', async () => {
    await seed([
      {
        path: 'users/leader',
        data: { ...approvedProfile(), uid: 'leader' },
      },
      {
        path: 'users/invitee',
        data: { ...approvedProfile(), uid: 'invitee' },
      },
      {
        path: 'users/outsider',
        data: { ...approvedProfile(), uid: 'outsider' },
      },
      {
        path: 'research_groups/group-1',
        data: {
          id: 'group-1',
          leaderUid: 'leader',
          memberIds: ['leader'],
          members: [{ uid: 'leader', fullName: 'Leader' }],
          status: 'incomplete',
        },
      },
    ]);

    const outsiderDb = testEnv.authenticatedContext('outsider').firestore();
    await assertFails(updateDoc(doc(outsiderDb, 'research_groups/group-1'), {
      memberIds: ['leader', 'outsider'],
      members: [
        { uid: 'leader', fullName: 'Leader' },
        { uid: 'outsider', fullName: 'Outsider' },
      ],
      status: 'incomplete',
      updatedAt: new Date().toISOString(),
    }));

    const leaderDb = testEnv.authenticatedContext('leader').firestore();
    await assertFails(updateDoc(doc(leaderDb, 'research_groups/group-1'), {
      memberIds: ['leader', 'invitee'],
      members: [
        { uid: 'leader', fullName: 'Leader' },
        { uid: 'invitee', fullName: 'Invitee' },
      ],
      status: 'incomplete',
      updatedAt: new Date().toISOString(),
    }));

    await assertSucceeds(setDoc(doc(leaderDb, 'group_invitations/invitation-1'), {
      id: 'invitation-1',
      groupId: 'group-1',
      groupName: 'Group 1',
      courseId: 'bsit',
      sectionId: 'section-a',
      inviterId: 'leader',
      inviteeId: 'invitee',
      status: 'pending',
      createdAt: new Date().toISOString(),
    }));

    const inviteeDb = testEnv.authenticatedContext('invitee').firestore();
    await assertSucceeds(updateDoc(doc(inviteeDb, 'research_groups/group-1'), {
      memberIds: ['leader', 'invitee'],
      members: [
        { uid: 'leader', fullName: 'Leader' },
        { uid: 'invitee', fullName: 'Invitee' },
      ],
      status: 'incomplete',
      updatedAt: new Date().toISOString(),
      lastAcceptedInvitationId: 'invitation-1',
    }));
    await assertSucceeds(updateDoc(doc(inviteeDb, 'group_invitations/invitation-1'), {
      status: 'accepted',
      respondedAt: new Date().toISOString(),
    }));
  });

  it('allows only an approved adviser to accept a request and update their assigned group', async () => {
    await seed([
      {
        path: 'users/student-1',
        data: { ...approvedProfile(), uid: 'student-1' },
      },
      {
        path: 'users/adviser-1',
        data: { ...approvedProfile('adviser'), uid: 'adviser-1' },
      },
      {
        path: 'research_groups/group-1',
        data: {
          id: 'group-1',
          leaderUid: 'student-1',
          memberIds: ['student-1'],
          members: [{ uid: 'student-1', fullName: 'Student' }],
          status: 'incomplete',
        },
      },
    ]);

    const studentDb = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(setDoc(doc(studentDb, 'adviser_requests/request-1'), {
      id: 'request-1',
      studentId: 'student-1',
      adviserId: 'adviser-1',
      groupId: 'group-1',
      status: 'pending',
    }));

    const adviserDb = testEnv.authenticatedContext('adviser-1').firestore();
    await assertSucceeds(updateDoc(doc(adviserDb, 'adviser_requests/request-1'), {
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    }));
    await assertSucceeds(updateDoc(doc(adviserDb, 'research_groups/group-1'), {
      adviserId: 'adviser-1',
      adviserName: 'Adviser',
      updatedAt: new Date().toISOString(),
      lastAcceptedAdviserRequestId: 'request-1',
    }));
  });

  it('limits evaluation submission to scheduled panelists and protects evaluator identity', async () => {
    await seed([
      {
        path: 'users/panelist-1',
        data: { ...approvedProfile('panelist'), uid: 'panelist-1' },
      },
      {
        path: 'users/student-1',
        data: { ...approvedProfile(), uid: 'student-1' },
      },
      {
        path: 'users/outsider',
        data: { ...approvedProfile(), uid: 'outsider' },
      },
      {
        path: 'defense_schedules/defense-1',
        data: { panelistIds: ['panelist-1'], projectId: 'project-1' },
      },
      {
        path: 'research_projects/project-1',
        data: { studentId: 'student-1' },
      },
    ]);

    const panelistDb = testEnv.authenticatedContext('panelist-1').firestore();
    const evaluation = doc(panelistDb, 'evaluations/evaluation-1');
    await assertSucceeds(setDoc(evaluation, {
      id: 'evaluation-1',
      defenseId: 'defense-1',
      projectId: 'project-1',
      panelistId: 'panelist-1',
      scores: { presentation: 10 },
      totalScore: 10,
      remarks: '',
      submittedAt: new Date().toISOString(),
    }));
    await assertSucceeds(updateDoc(evaluation, {
      scores: { presentation: 9 },
      totalScore: 9,
      remarks: 'Updated',
      submittedAt: new Date().toISOString(),
    }));
    await assertFails(updateDoc(evaluation, { panelistId: 'outsider' }));

    const outsiderDb = testEnv.authenticatedContext('outsider').firestore();
    await assertFails(setDoc(doc(outsiderDb, 'evaluations/unauthorized-evaluation'), {
      id: 'unauthorized-evaluation',
      defenseId: 'defense-1',
      projectId: 'project-1',
      panelistId: 'outsider',
      scores: { presentation: 10 },
      totalScore: 10,
      remarks: '',
      submittedAt: new Date().toISOString(),
    }));

    const studentDb = testEnv.authenticatedContext('student-1').firestore();
    await assertSucceeds(getDoc(doc(studentDb, 'evaluations/evaluation-1')));

    await assertFails(getDoc(doc(outsiderDb, 'evaluations/evaluation-1')));
  });

  it('restricts notifications to their recipient and authenticated sender', async () => {
    await seed([
      {
        path: 'users/sender',
        data: { ...approvedProfile(), uid: 'sender' },
      },
      {
        path: 'users/recipient',
        data: { ...approvedProfile(), uid: 'recipient' },
      },
      {
        path: 'users/outsider',
        data: { ...approvedProfile(), uid: 'outsider' },
      },
      {
        path: 'users/pending',
        data: {
          uid: 'pending',
          role: 'student',
          role_id: 'student',
          status: 'pending',
          is_approved: false,
        },
      },
    ]);

    const senderDb = testEnv.authenticatedContext('sender').firestore();
    const notification = doc(senderDb, 'notifications/notification-1');
    await assertSucceeds(setDoc(notification, {
      id: 'notification-1',
      userId: 'recipient',
      createdByUid: 'sender',
      title: 'Test notification',
      message: 'A test message',
      type: 'info',
      read: false,
      createdAt: new Date().toISOString(),
    }));

    const recipientDb = testEnv.authenticatedContext('recipient').firestore();
    await assertSucceeds(getDoc(doc(recipientDb, 'notifications/notification-1')));
    await assertSucceeds(updateDoc(doc(recipientDb, 'notifications/notification-1'), {
      read: true,
    }));

    const outsiderDb = testEnv.authenticatedContext('outsider').firestore();
    await assertFails(getDoc(doc(outsiderDb, 'notifications/notification-1')));

    const pendingDb = testEnv.authenticatedContext('pending').firestore();
    await assertFails(setDoc(doc(pendingDb, 'notifications/forged-alert'), {
      userId: 'recipient',
      createdByUid: 'pending',
      title: 'Forged notification',
      message: 'Not allowed',
      type: 'system',
      read: false,
      createdAt: new Date().toISOString(),
    }));
  });
});
