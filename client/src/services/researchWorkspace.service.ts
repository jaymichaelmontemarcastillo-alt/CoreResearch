// src/services/researchWorkspace.service.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  ManuscriptWorkspace,
  ManuscriptSection,
  SectionStatus,
  DEFAULT_MANUSCRIPT_SECTIONS,
} from '../types/researchWorkspace.types';
import { AdviserRequest } from './adviserRequest.service';
import { UserProfile } from '../types/user.types';
import { TitleProposal } from '../types/proposal.types';
import progressService from './progress.service';
import { systemActivityService } from './systemActivity.service';
import { researchFeedbackService } from './researchFeedback.service';

const COLLECTION_NAME = 'manuscript_workspaces';

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const researchWorkspaceService = {
  /**
   * Get or create a manuscript workspace for an accepted Adviser Request
   */
  async getOrCreateWorkspaceForAdviserRequest(
    request: AdviserRequest,
    userProfile: UserProfile
  ): Promise<ManuscriptWorkspace> {
    const workspaceId = `ws-${request.id}`;
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existing = docSnap.data() as ManuscriptWorkspace;
      if (request.groupId && (!existing.memberIds || !existing.memberIds.includes(userProfile?.uid))) {
        try {
          const groupSnap = await getDoc(doc(db, 'research_groups', request.groupId));
          if (groupSnap.exists()) {
            const gData = groupSnap.data();
            const mergedIds = Array.from(new Set([...(existing.memberIds || [existing.studentId]), ...(gData.memberIds || [])]));
            await updateDoc(docRef, {
              memberIds: mergedIds,
              members: gData.members || existing.members || [],
              updatedAt: new Date().toISOString()
            });
            existing.memberIds = mergedIds;
            existing.members = gData.members || existing.members || [];
          }
        } catch (e) {
          console.warn('[researchWorkspaceService] Member sync error on existing workspace:', e);
        }
      }
      return existing;
    }

    let memberIds = [request.studentId || userProfile.uid];
    let members: any[] = [{
      uid: request.studentId || userProfile.uid,
      fullName: request.studentName || userProfile.fullName || 'Student Researcher',
      email: userProfile.email || '',
    }];

    if (request.groupId) {
      try {
        const groupSnap = await getDoc(doc(db, 'research_groups', request.groupId));
        if (groupSnap.exists()) {
          const gData = groupSnap.data();
          if (Array.isArray(gData.memberIds) && gData.memberIds.length > 0) {
            memberIds = Array.from(new Set([...memberIds, ...gData.memberIds]));
          }
          if (Array.isArray(gData.members) && gData.members.length > 0) {
            members = gData.members;
          }
        }
      } catch (e) {
        console.warn('[researchWorkspaceService] group member resolution fallback:', e);
      }
    }

    const now = new Date().toISOString();
    
    const d = new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Jan, 7 = Aug
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    let semester = 'summer';
    if (month >= 7 && month <= 11) semester = '1st';
    else if (month >= 0 && month <= 4) semester = '2nd';

    const newWorkspace: ManuscriptWorkspace = {
      id: workspaceId,
      proposalId: request.id, // Keeping proposalId field but pointing to request ID for backward compatibility
      title: request.researchTitle || 'Research Manuscript',
      studentId: request.studentId || userProfile.uid,
      studentName: request.studentName || userProfile.fullName || 'Student Researcher',
      groupId: request.groupId || '',
      groupName: request.groupName || 'Research Group',
      courseId: request.courseId || userProfile.courseId || '',
      memberIds,
      members,
      adviserId: request.adviserId || '',
      adviserName: request.adviserName || 'Assigned Adviser',
      department: userProfile.department || 'Computer Studies',
      academicYear,
      semester,
      status: 'in_progress',
      researchPhase: 'CHAPTERS_1_3',
      sections: DEFAULT_MANUSCRIPT_SECTIONS,
      overallProgress: 0, // Manuscript progress starts at 0% until chapters are completed
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newWorkspace) as ManuscriptWorkspace);
    return newWorkspace;
  },

  /**
   * Get or create a manuscript workspace for an approved proposal / group
   */
  async getOrCreateWorkspaceForProposal(
    proposal: TitleProposal,
    userProfile: UserProfile,
    adviserInfo?: { id: string; name: string }
  ): Promise<ManuscriptWorkspace> {
    // 1. Try finding existing workspace by proposalId or groupId
    const existing = await this.getWorkspaceByStudentOrGroup(
      proposal.submittedByUid || userProfile?.uid,
      proposal.groupId
    );
    if (existing) {
      return existing;
    }

    const workspaceId = `ws-prop-${proposal.id}`;
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ManuscriptWorkspace;
    }

    let memberIds = proposal.memberIds || (proposal.submittedByUid ? [proposal.submittedByUid] : []);
    let members = proposal.members || [];

    if (proposal.groupId && memberIds.length <= 1) {
      try {
        const groupSnap = await getDoc(doc(db, 'research_groups', proposal.groupId));
        if (groupSnap.exists()) {
          const gData = groupSnap.data();
          if (Array.isArray(gData.memberIds) && gData.memberIds.length > 0) {
            memberIds = Array.from(new Set([...memberIds, ...gData.memberIds]));
          }
          if (Array.isArray(gData.members) && gData.members.length > 0) {
            members = gData.members;
          }
        }
      } catch (e) {}
    }

    const now = new Date().toISOString();
    
    const d = new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0 = Jan, 7 = Aug
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    
    let semester = 'summer';
    if (month >= 7 && month <= 11) semester = '1st';
    else if (month >= 0 && month <= 4) semester = '2nd';

    const newWorkspace: ManuscriptWorkspace = {
      id: workspaceId,
      proposalId: proposal.id,
      title: proposal.title || 'Research Manuscript',
      studentId: proposal.submittedByUid || userProfile.uid,
      studentName: proposal.submittedByName || userProfile.fullName || 'Student Researcher',
      groupId: proposal.groupId || '',
      groupName: proposal.groupName || 'Research Group',
      memberIds,
      members,
      courseId: proposal.courseId || userProfile.courseId || '',
      adviserId: adviserInfo?.id || '',
      adviserName: adviserInfo?.name || 'Pending Adviser',
      department: userProfile.department || 'Computer Studies',
      academicYear,
      semester,
      status: 'in_progress',
      researchPhase: 'CHAPTERS_1_3',
      sections: DEFAULT_MANUSCRIPT_SECTIONS,
      overallProgress: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newWorkspace) as ManuscriptWorkspace);
    return newWorkspace;
  },

  /**

   * Get or create a manuscript workspace for a Research Group
   * Automatically resolves any group-level research title, adviser, and members
   */
  async getOrCreateWorkspaceForGroup(
    group: any,
    userProfile?: any,
    leaderUid?: string
  ): Promise<ManuscriptWorkspace> {
    if (!group?.id) {
      throw new Error('Valid research group is required to resolve workspace.');
    }

    const resolvedLeaderUid =
      leaderUid ||
      group.memberIds?.[0] ||
      group.members?.[0]?.uid ||
      userProfile?.uid ||
      '';

    // 1. Check if workspace already exists for this groupId
    const q = query(collection(db, COLLECTION_NAME), where('groupId', '==', group.id));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const existing = snap.docs[0].data() as ManuscriptWorkspace;
      // Ensure all current group members are in memberIds
      const gMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
      const currentIds = Array.isArray(existing.memberIds) ? existing.memberIds : [existing.studentId];
      const mergedIds = Array.from(new Set([...currentIds, ...gMemberIds]));
      
      const needsUpdate = mergedIds.length !== currentIds.length || 
        (!existing.title && group.title) || 
        (!existing.adviserId && group.adviserId);

      if (needsUpdate) {
        const docRef = doc(db, COLLECTION_NAME, existing.id);
        const updates: any = {
          memberIds: mergedIds,
          members: group.members || existing.members || [],
          updatedAt: new Date().toISOString(),
        };
        if (!existing.title && group.title) updates.title = group.title;
        if (!existing.adviserId && group.adviserId) {
          updates.adviserId = group.adviserId;
          updates.adviserName = group.adviserName || '';
        }
        await updateDoc(docRef, updates);
        return { ...existing, ...updates };
      }
      return existing;
    }

    // 1b. Check if the group leader already has a workspace created
    if (resolvedLeaderUid) {
      const leaderQ = query(
        collection(db, COLLECTION_NAME),
        where('studentId', '==', resolvedLeaderUid)
      );
      const leaderSnap = await getDocs(leaderQ);
      let leaderWs = leaderSnap.empty ? null : (leaderSnap.docs[0].data() as ManuscriptWorkspace);

      if (!leaderWs) {
        const leaderMemberQ = query(
          collection(db, COLLECTION_NAME),
          where('memberIds', 'array-contains', resolvedLeaderUid)
        );
        const leaderMemberSnap = await getDocs(leaderMemberQ);
        if (!leaderMemberSnap.empty) {
          leaderWs = leaderMemberSnap.docs[0].data() as ManuscriptWorkspace;
        }
      }

      if (leaderWs) {
        // Link the leader's existing workspace directly to this group and all its members
        const docRef = doc(db, COLLECTION_NAME, leaderWs.id);
        const gMemberIds = Array.isArray(group.memberIds) ? group.memberIds : [];
        const currentIds = Array.isArray(leaderWs.memberIds) ? leaderWs.memberIds : [leaderWs.studentId];
        const mergedIds = Array.from(new Set([...currentIds, ...gMemberIds]));

        const updates: any = {
          groupId: group.id,
          groupName: group.name || leaderWs.groupName || 'Research Group',
          memberIds: mergedIds,
          members: group.members || leaderWs.members || [],
          updatedAt: new Date().toISOString(),
        };
        if (!leaderWs.title && group.title) updates.title = group.title;
        if (!leaderWs.adviserId && group.adviserId) {
          updates.adviserId = group.adviserId;
          updates.adviserName = group.adviserName || '';
        }
        await updateDoc(docRef, updates);
        return { ...leaderWs, ...updates };
      }
    }

    // 2. Look for accepted adviser request or proposal for this group or leader to inherit details
    let resolvedTitle = group.title || '';
    let resolvedAdviserId = group.adviserId || '';
    let resolvedAdviserName = group.adviserName || '';
    let proposalId = '';

    try {
      // Check proposals by groupId first, then fallback to leader
      let propSnap = await getDocs(query(collection(db, 'proposals'), where('groupId', '==', group.id)));
      if (propSnap.empty && resolvedLeaderUid) {
        propSnap = await getDocs(query(collection(db, 'proposals'), where('submittedByUid', '==', resolvedLeaderUid)));
      }
      if (!propSnap.empty) {
        const prop = propSnap.docs[0].data();
        if (!resolvedTitle && prop.title) resolvedTitle = prop.title;
        if (prop.id) proposalId = prop.id;
      }

      // Check adviser requests by groupId first, then fallback to leader
      let reqSnap = await getDocs(query(collection(db, 'adviser_requests'), where('groupId', '==', group.id)));
      if (reqSnap.empty && resolvedLeaderUid) {
        reqSnap = await getDocs(query(collection(db, 'adviser_requests'), where('studentId', '==', resolvedLeaderUid)));
      }
      if (!reqSnap.empty) {
        const req = reqSnap.docs[0].data();
        if (!resolvedTitle && req.researchTitle) resolvedTitle = req.researchTitle;
        if (!resolvedAdviserId && req.adviserId) {
          resolvedAdviserId = req.adviserId;
          resolvedAdviserName = req.adviserName || '';
        }
        if (!proposalId && req.id) proposalId = req.id;
      }
    } catch (e) {
      console.warn('[researchWorkspaceService] Fallback reading group research assets:', e);
    }

    const workspaceId = `ws-group-${group.id}`;
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const now = new Date().toISOString();

    const memberIds = Array.isArray(group.memberIds) && group.memberIds.length > 0
      ? group.memberIds
      : [userProfile?.uid || ''];
    const members = Array.isArray(group.members) && group.members.length > 0
      ? group.members
      : (userProfile ? [{ uid: userProfile.uid, fullName: userProfile.fullName, email: userProfile.email }] : []);

    const leaderId = group.memberIds?.[0] || userProfile?.uid || '';
    const leaderName = group.members?.[0]?.fullName || userProfile?.fullName || 'Student Researcher';

    const newWorkspace: ManuscriptWorkspace = {
      id: workspaceId,
      proposalId: proposalId || `prop-${group.id}`,
      title: resolvedTitle || group.name ? `${resolvedTitle || group.name + ' Research'}` : 'Research Manuscript',
      studentId: leaderId,
      studentName: leaderName,
      groupId: group.id,
      groupName: group.name || 'Research Group',
      memberIds,
      members,
      adviserId: resolvedAdviserId,
      adviserName: resolvedAdviserName,
      department: userProfile?.department || 'Computer Studies',
      status: 'in_progress',
      researchPhase: 'CHAPTERS_1_3',
      sections: DEFAULT_MANUSCRIPT_SECTIONS,
      overallProgress: 0,
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newWorkspace) as ManuscriptWorkspace);
    return newWorkspace;
  },

  /**
   * Add a member to a manuscript workspace
   */
  async addMemberToWorkspace(
    workspaceId: string,
    member: { uid: string; fullName: string; email?: string; studentNumber?: string }
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const ws = snap.data() as ManuscriptWorkspace;
    const currentMemberIds = Array.isArray(ws.memberIds) ? ws.memberIds : [ws.studentId];
    if (currentMemberIds.includes(member.uid)) return; // Already present

    const updatedMemberIds = [...currentMemberIds, member.uid];
    const currentMembers = Array.isArray(ws.members) ? ws.members : [];
    const updatedMembers = [...currentMembers.filter(m => m.uid !== member.uid), member];

    await updateDoc(docRef, {
      memberIds: updatedMemberIds,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Remove a member from a manuscript workspace
   */
  async removeMemberFromWorkspace(workspaceId: string, memberUid: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const ws = snap.data() as ManuscriptWorkspace;
    const currentMemberIds = Array.isArray(ws.memberIds) ? ws.memberIds : [];
    const currentMembers = Array.isArray(ws.members) ? ws.members : [];

    await updateDoc(docRef, {
      memberIds: currentMemberIds.filter(id => id !== memberUid),
      members: currentMembers.filter(m => m.uid !== memberUid),
      updatedAt: new Date().toISOString(),
    });
  },

  /**

   * Fetch workspace by workspace ID
   */
  async getWorkspaceById(id: string): Promise<ManuscriptWorkspace | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as ManuscriptWorkspace;
  },

  /**
   * Fetch workspace by Student UID or Group ID, with automatic leader asset resolution
   */
  async getWorkspaceByStudentOrGroup(
    studentUid: string,
    groupId?: string,
    leaderUid?: string
  ): Promise<ManuscriptWorkspace | null> {
    // 1. Query by groupId if available
    if (groupId) {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId)
      );
      const snap = await getDocs(q);
      const activeDocs = snap.docs.map(doc => doc.data() as ManuscriptWorkspace).filter(w => w.status !== 'archived' && !w.isArchived);
      if (activeDocs.length > 0) {
        const ws = activeDocs[0];
        // Ensure studentUid is included in memberIds if missing
        if (studentUid && ws.memberIds && !ws.memberIds.includes(studentUid)) {
          const updatedIds = Array.from(new Set([...ws.memberIds, studentUid]));
          updateDoc(doc(db, COLLECTION_NAME, ws.id), {
            memberIds: updatedIds,
            updatedAt: new Date().toISOString(),
          }).catch(() => {});
          ws.memberIds = updatedIds;
        }
        return ws;
      }

      // If no leaderUid was passed explicitly, try resolving from group doc
      if (!leaderUid) {
        try {
          const groupSnap = await getDoc(doc(db, 'research_groups', groupId));
          if (groupSnap.exists()) {
            const gData = groupSnap.data();
            leaderUid = gData.memberIds?.[0] || gData.members?.[0]?.uid;
          }
        } catch (e) {}
      }
    }

    // 2. Query by leaderUid (Group leader's workspace)
    if (leaderUid) {
      // Check if leader created workspace directly
      const qLeader = query(
        collection(db, COLLECTION_NAME),
        where('studentId', '==', leaderUid)
      );
      const snapLeader = await getDocs(qLeader);
      const activeLeaderDocs = snapLeader.docs.map(doc => doc.data() as ManuscriptWorkspace).filter(w => w.status !== 'archived' && !w.isArchived);
      let leaderWs = activeLeaderDocs.length === 0 ? null : activeLeaderDocs[0];

      if (!leaderWs) {
        const qLeaderMember = query(
          collection(db, COLLECTION_NAME),
          where('memberIds', 'array-contains', leaderUid)
        );
        const snapLeaderMember = await getDocs(qLeaderMember);
        const activeLeaderMemberDocs = snapLeaderMember.docs.map(doc => doc.data() as ManuscriptWorkspace).filter(w => w.status !== 'archived' && !w.isArchived);
        if (activeLeaderMemberDocs.length > 0) {
          leaderWs = activeLeaderMemberDocs[0];
        }
      }

      if (leaderWs) {
        // Link this workspace to the group and add the student
        try {
          const wsRef = doc(db, COLLECTION_NAME, leaderWs.id);
          const currentMemberIds = Array.isArray(leaderWs.memberIds) ? leaderWs.memberIds : [leaderWs.studentId];
          const updatedMemberIds = Array.from(new Set([...currentMemberIds, ...(studentUid ? [studentUid] : [])]));
          const updates: any = {
            memberIds: updatedMemberIds,
            updatedAt: new Date().toISOString(),
          };
          if (groupId && !leaderWs.groupId) {
            updates.groupId = groupId;
          }
          await updateDoc(wsRef, updates);
          leaderWs.memberIds = updatedMemberIds;
          if (groupId) leaderWs.groupId = groupId;
        } catch (e) {
          console.warn('[researchWorkspaceService] Error backfilling leader workspace:', e);
        }
        return leaderWs;
      }
    }

    if (studentUid) {
      // 3. Query by memberIds array-contains
      const qMember = query(
        collection(db, COLLECTION_NAME),
        where('memberIds', 'array-contains', studentUid)
      );
      const snapMember = await getDocs(qMember);
      const activeMemberDocs = snapMember.docs.map(doc => doc.data() as ManuscriptWorkspace).filter(w => w.status !== 'archived' && !w.isArchived);
      if (activeMemberDocs.length > 0) {
        return activeMemberDocs[0];
      }

      // 4. Query by studentId (creator)
      const q = query(
        collection(db, COLLECTION_NAME),
        where('studentId', '==', studentUid)
      );
      const snap = await getDocs(q);
      const activeDocs = snap.docs.map(doc => doc.data() as ManuscriptWorkspace).filter(w => w.status !== 'archived' && !w.isArchived);
      if (activeDocs.length > 0) {
        return activeDocs[0];
      }
    }

    return null;
  },

  /**
   * Fetch all workspaces assigned to a specific adviser
   */
  async getWorkspacesByAdviser(adviserId: string): Promise<ManuscriptWorkspace[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ManuscriptWorkspace);
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Fetch all workspaces (for Coordinators / Admins)
   */
  async getAllWorkspaces(): Promise<ManuscriptWorkspace[]> {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const list = snap.docs.map((d) => d.data() as ManuscriptWorkspace);
    return list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * Real-time subscription to a workspace
   */
  subscribeWorkspace(
    id: string,
    onUpdate: (workspace: ManuscriptWorkspace | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    const docRef = doc(db, COLLECTION_NAME, id);
    return onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          onUpdate(snap.data() as ManuscriptWorkspace);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        console.warn('[researchWorkspaceService] subscribe error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Link an existing or newly created TipTap documentId to the workspace
   */
  async linkDocumentId(workspaceId: string, documentId: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      documentId,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Update a section's status and progress within a workspace
   */
  async updateSectionStatus(
    workspaceId: string,
    sectionId: string,
    status: SectionStatus,
    progress: number = 0
  ): Promise<void> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    const now = new Date().toISOString();
    const updatedSections = (ws.sections || DEFAULT_MANUSCRIPT_SECTIONS).map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          status,
          progress: status === 'completed' ? 100 : progress,
          updatedAt: now,
          ...(status === 'submitted' ? { submittedAt: now } : {}),
          ...(status === 'completed' || status === 'under_review' ? { reviewedAt: now } : {}),
        };
      }
      return s;
    });

    const newOverall = progressService.calculateWorkspaceProgress({
      ...ws,
      sections: updatedSections,
    });

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
      ...(newOverall >= 100
        ? { status: 'approved' }
        : status === 'revision_required'
        ? { status: 'revision_required' }
        : {}),
      updatedAt: now,
    });
  },

  /**
   * Student submits a chapter for adviser review
   */
  async submitChapter(
    workspaceId: string,
    chapterId: string,
    studentUid?: string,
    studentName?: string
  ): Promise<void> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    const now = new Date().toISOString();
    const updatedSections = (ws.sections || DEFAULT_MANUSCRIPT_SECTIONS).map((s) => {
      if (s.id === chapterId) {
        return {
          ...s,
          status: 'submitted' as SectionStatus,
          progress: 75,
          submittedAt: now,
          updatedAt: now,
        };
      }
      return s;
    });

    const newOverall = progressService.calculateWorkspaceProgress({
      ...ws,
      sections: updatedSections,
    });

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
      status: 'submitted_for_review',
      updatedAt: now,
    });

    const targetSection = updatedSections.find((s) => s.id === chapterId);
    systemActivityService
      .logActivity({
        title: `Chapter Submitted for Review`,
        description: `${studentName || 'Student'} submitted ${targetSection?.name || chapterId} for adviser review.`,
        category: 'workspace',
        actorRole: 'student',
        actorName: studentName || ws.studentName || 'Student Researcher',
      })
      .catch(console.warn);
  },

  /**
   * Adviser approves a chapter
   */
  async approveChapter(
    workspaceId: string,
    chapterId: string,
    adviserUid?: string,
    adviserName?: string
  ): Promise<number> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    const now = new Date().toISOString();
    const updatedSections = (ws.sections || DEFAULT_MANUSCRIPT_SECTIONS).map((s) => {
      if (s.id === chapterId) {
        // Clear any old revision feedback notes on chapter approval
        const { feedbackComment, ...prev } = s;
        return {
          ...prev,
          status: 'completed' as SectionStatus,
          progress: 100,
          reviewedAt: now,
          completedAt: now,
          updatedAt: now,
        };
      }
      return s;
    });

    const newOverall = progressService.calculateWorkspaceProgress({
      ...ws,
      sections: updatedSections,
    });

    const isAllCompleted = newOverall >= 100;

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
      status: isAllCompleted ? 'approved' : 'in_progress',
      updatedAt: now,
    });

    const targetSection = updatedSections.find((s) => s.id === chapterId);
    systemActivityService
      .logActivity({
        title: `Chapter Approved`,
        description: `${adviserName || 'Faculty Adviser'} approved ${targetSection?.name || chapterId}. Progress is now ${newOverall}%.`,
        category: 'workspace',
        actorRole: 'adviser',
        actorName: adviserName || ws.adviserName || 'Faculty Adviser',
      })
      .catch(console.warn);

    return newOverall;
  },

  /**
   * Faculty / Adviser / Panelist requests revisions for a chapter
   */
  async requestRevisionChapter(
    workspaceId: string,
    chapterId: string,
    feedbackComment: string,
    reviewerUid?: string,
    reviewerName?: string,
    reviewerRole: 'adviser' | 'panelist' | 'coordinator' | 'admin' = 'adviser'
  ): Promise<number> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    const now = new Date().toISOString();
    const updatedSections = (ws.sections || DEFAULT_MANUSCRIPT_SECTIONS).map((s) => {
      if (s.id === chapterId) {
        // Clear completedAt when reverting an approved chapter to revision_required
        const { completedAt, ...prev } = s;
        return {
          ...prev,
          status: 'revision_required' as SectionStatus,
          progress: 50,
          reviewedAt: now,
          feedbackComment: feedbackComment || 'Revision required by reviewer',
          updatedAt: now,
        };
      }
      return s;
    });

    const newOverall = progressService.calculateWorkspaceProgress({
      ...ws,
      sections: updatedSections,
    });

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
      status: 'revision_required',
      updatedAt: now,
    });

    const targetSection = updatedSections.find((s) => s.id === chapterId);
    const displayRole =
      reviewerRole === 'panelist'
        ? 'Defense Panelist'
        : reviewerRole === 'coordinator'
        ? 'Research Coordinator'
        : 'Faculty Adviser';

    systemActivityService
      .logActivity({
        title: `Revision Requested`,
        description: `${reviewerName || displayRole} requested revisions for ${targetSection?.name || chapterId}: "${feedbackComment}".`,
        category: 'feedback',
        actorRole: reviewerRole,
        actorName: reviewerName || ws.adviserName || displayRole,
      })
      .catch(console.warn);

    // Create research feedback entry for advisees to track and resolve
    if (feedbackComment) {
      researchFeedbackService
        .createFeedback({
          workspaceId,
          studentId: ws.studentId || '',
          authorId: reviewerUid || ws.adviserId,
          authorName: reviewerName || ws.adviserName || displayRole,
          authorRole: reviewerRole,
          sectionId: chapterId,
          comment: feedbackComment,
        })
        .catch(console.warn);
    }

    return newOverall;
  },

  /**
   * Start working on a chapter (transitions from not_started/revision_required to in_progress)
   */
  async startChapter(workspaceId: string, chapterId: string): Promise<void> {
    const ws = await this.getWorkspaceById(workspaceId);
    if (!ws) throw new Error('Workspace not found.');

    const now = new Date().toISOString();
    const updatedSections = (ws.sections || DEFAULT_MANUSCRIPT_SECTIONS).map((s) => {
      if (s.id === chapterId && (s.status === 'not_started' || s.status === 'pending' || s.status === 'revision_required')) {
        return {
          ...s,
          status: 'in_progress' as SectionStatus,
          progress: Math.max(25, s.progress || 25),
          updatedAt: now,
        };
      }
      return s;
    });

    const newOverall = progressService.calculateWorkspaceProgress({
      ...ws,
      sections: updatedSections,
    });

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
      status: 'in_progress',
      updatedAt: now,
    });
  },

  /**
   * Update assigned adviser for a workspace
   */
  async assignAdviser(
    workspaceId: string,
    adviserId: string,
    adviserName: string
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      adviserId,
      adviserName,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a workspace (useful for development/testing resets)
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    try {
      // 1. Delete associated tasks
      const tasksQuery = query(collection(db, 'research_tasks'), where('workspaceId', '==', workspaceId));
      const taskDocs = await getDocs(tasksQuery);
      for (const tDoc of taskDocs.docs) {
        await deleteDoc(tDoc.ref);
      }
    } catch (e) {
      console.warn('Error deleting associated research tasks:', e);
    }

    try {
      // 2. Delete associated feedback
      const fbQuery = query(collection(db, 'research_feedback'), where('workspaceId', '==', workspaceId));
      const fbDocs = await getDocs(fbQuery);
      for (const fDoc of fbDocs.docs) {
        await deleteDoc(fDoc.ref);
      }
    } catch (e) {
      console.warn('Error deleting associated research feedback:', e);
    }

    // 3. Delete workspace document
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await deleteDoc(docRef);
  },
};

export default researchWorkspaceService;
