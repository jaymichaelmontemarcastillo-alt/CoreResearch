// src/services/researchWorkspace.service.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase/firebase';
import api from './api';
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
import { notificationService } from './notification.service';
import { dataCache } from './dataCache';


const COLLECTION_NAME = 'manuscript_workspaces';

const isActiveWorkspace = (workspace: ManuscriptWorkspace) =>
  workspace.status !== 'archived' && !workspace.isArchived;

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const researchWorkspaceService = {
  /**
   * Restart research progress for a workspace
   * Archives workspace, manuscript, tasks, rubrics, comments, and schedules while keeping group members and accounts intact.
   */
  async restartWorkspace(workspaceId: string, reason?: string): Promise<any> {
    const defaultReason = reason || 'Student restarted research progress';
    let backendSuccess = false;
    let backendData = null;

    // 1. Try authoritative backend first (tries both /workspace and /workspaces)
    try {
      const res = await api.post(`/workspace/${workspaceId}/restart`, { reason: defaultReason }).catch(async () => {
        return await api.post(`/workspaces/${workspaceId}/restart`, { reason: defaultReason });
      });
      if (res?.data?.success) {
        backendSuccess = true;
        backendData = res.data;
      }
    } catch (apiErr) {
      console.warn('[researchWorkspaceService] Backend restart API returned error or was unavailable, proceeding with direct Firestore archive fallback:', apiErr);
    }

    // 2. Perform direct Firestore archival as a guarantee (works in all environments, offline, serverless, or if backend returned 404)
    try {
      const now = new Date().toISOString();
      const currentUid = auth.currentUser?.uid || '';
      const currentName = auth.currentUser?.displayName || 'Student Researcher';

      const wsRef = doc(db, COLLECTION_NAME, workspaceId);
      const wsSnap = await getDoc(wsRef).catch(() => null);
      const wsData = wsSnap?.exists() ? (wsSnap.data() as ManuscriptWorkspace) : null;
      const groupId = wsData?.groupId || (workspaceId.startsWith('ws-group-') ? workspaceId.replace('ws-group-', '') : '');
      const documentId = wsData?.documentId;
      const proposalId = wsData?.proposalId;

      // A. Archive the workspace document
      if (wsSnap?.exists()) {
        await updateDoc(wsRef, {
          isArchived: true,
          status: 'archived',
          archivedAt: now,
          archivedBy: currentUid,
          archivedByName: currentName,
          archiveReason: defaultReason,
          updatedAt: now,
        }).catch((e) => console.warn('[researchWorkspaceService] archive ws doc error:', e));
      }

      // B. Archive manuscript document if exists
      if (documentId) {
        await updateDoc(doc(db, 'manuscript_documents', documentId), {
          isArchived: true,
          status: 'archived',
          archivedAt: now,
          archivedBy: currentUid,
          archiveReason: defaultReason,
          updatedAt: now,
        }).catch(() => null);
      }
      try {
        const docQuery = query(collection(db, 'manuscript_documents'), where('workspaceId', '==', workspaceId));
        const docSnaps = await getDocs(docQuery);
        for (const dDoc of docSnaps.docs) {
          await updateDoc(dDoc.ref, {
            isArchived: true,
            status: 'archived',
            archivedAt: now,
            archivedBy: currentUid,
            archiveReason: defaultReason,
            updatedAt: now,
          }).catch(() => null);
        }
      } catch (e) {}

      // C. Archive proposals for this group/workspace
      const propPromises = [];
      if (groupId) {
        propPromises.push(getDocs(query(collection(db, 'proposals'), where('groupId', '==', groupId))));
      }
      if (proposalId) {
        propPromises.push(getDocs(query(collection(db, 'proposals'), where('id', '==', proposalId))));
      }
      if (currentUid) {
        propPromises.push(getDocs(query(collection(db, 'proposals'), where('submittedByUid', '==', currentUid))));
      }
      const propSnaps = await Promise.all(propPromises).catch(() => []);
      for (const pSnap of propSnaps) {
        if (pSnap && pSnap.docs) {
          for (const pDoc of pSnap.docs) {
            await updateDoc(pDoc.ref, {
              isArchived: true,
              status: 'archived',
              archivedAt: now,
              updatedAt: now,
            }).catch(() => null);
          }
        }
      }

      // D. Archive research tasks
      try {
        const taskSnap = await getDocs(query(collection(db, 'research_tasks'), where('workspaceId', '==', workspaceId)));
        for (const tDoc of taskSnap.docs) {
          await updateDoc(tDoc.ref, {
            isArchived: true,
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
          }).catch(() => null);
        }
      } catch (te) {
        console.warn('[researchWorkspaceService] tasks archive warning:', te);
      }

      // E. Archive research feedback and comments
      try {
        const fbSnap = await getDocs(query(collection(db, 'research_feedback'), where('workspaceId', '==', workspaceId)));
        for (const fDoc of fbSnap.docs) {
          await updateDoc(fDoc.ref, {
            isArchived: true,
            status: 'archived',
            archivedAt: now,
            updatedAt: now,
          }).catch(() => null);
        }
      } catch (fe) {
        console.warn('[researchWorkspaceService] feedback archive warning:', fe);
      }

      // F. Archive defense schedules in Firestore
      if (groupId) {
        try {
          const schSnap = await getDocs(query(collection(db, 'defense_schedules'), where('projectId', '==', groupId)));
          for (const sDoc of schSnap.docs) {
            await updateDoc(sDoc.ref, {
              status: 'archived',
              isArchived: true,
              updatedAt: now,
            }).catch(() => null);
          }
        } catch (se) {
          console.warn('[researchWorkspaceService] schedules archive warning:', se);
        }
      }

      // G. Archive rubric evaluations
      try {
        const evalQueries = [
          getDocs(query(collection(db, 'proposal_evaluations'), where('workspaceId', '==', workspaceId))).catch(() => null),
          getDocs(query(collection(db, 'final_evaluations'), where('workspaceId', '==', workspaceId))).catch(() => null),
        ];
        if (groupId) {
          evalQueries.push(getDocs(query(collection(db, 'proposal_evaluations'), where('groupId', '==', groupId))).catch(() => null));
          evalQueries.push(getDocs(query(collection(db, 'final_evaluations'), where('groupId', '==', groupId))).catch(() => null));
          evalQueries.push(getDocs(query(collection(db, 'evaluations'), where('projectId', '==', groupId))).catch(() => null));
        }
        const evalSnaps = await Promise.all(evalQueries);
        for (const eSnap of evalSnaps) {
          if (eSnap && eSnap.docs) {
            for (const eDoc of eSnap.docs) {
              await updateDoc(eDoc.ref, {
                isArchived: true,
                status: 'archived',
                archivedAt: now,
                updatedAt: now,
              }).catch(() => null);
            }
          }
        }
      } catch (ee) {
        console.warn('[researchWorkspaceService] evaluations archive warning:', ee);
      }

      // H. Cancel active adviser requests
      if (groupId) {
        try {
          const reqSnap = await getDocs(query(collection(db, 'adviser_requests'), where('groupId', '==', groupId)));
          for (const rDoc of reqSnap.docs) {
            await updateDoc(rDoc.ref, {
              isArchived: true,
              status: 'cancelled',
              archiveReason: defaultReason,
              updatedAt: now,
            }).catch(() => null);
          }
        } catch (re) {
          console.warn('[researchWorkspaceService] requests archive warning:', re);
        }
      }

      // H2. Archive any sibling or active workspaces for this group
      if (groupId) {
        try {
          const wsQ = query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId));
          const wsDocs = await getDocs(wsQ);
          for (const d of wsDocs.docs) {
            await updateDoc(d.ref, {
              isArchived: true,
              status: 'archived',
              archivedAt: now,
              archivedBy: currentUid,
              archivedByName: currentName,
              archiveReason: defaultReason,
              updatedAt: now,
            }).catch(() => null);
          }
        } catch (we) {
          console.warn('[researchWorkspaceService] sibling workspaces archive warning:', we);
        }
      }

      // I. Reset the Research Group — KEEP MEMBERS AND ACCOUNTS INTACT!
      if (groupId) {
        try {
          const groupRef = doc(db, 'research_groups', groupId);
          const gSnap = await getDoc(groupRef);
          if (gSnap.exists()) {
            await updateDoc(groupRef, {
              workspaceId: '',
              documentId: '',
              title: '',
              currentPhase: 'proposal',
              status: 'forming',
              adviserId: '',
              adviserName: '',
              panelists: [],
              panelistIds: [],
              panelistNames: [],
              redefenseRequired: false,
              updatedAt: now,
            }).catch(() => null);
          }
        } catch (ge) {
          console.warn('[researchWorkspaceService] reset group doc warning:', ge);
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('workspace-status-changed', { detail: { hasWorkspace: false } }));
      }

      dataCache.invalidatePattern('workspace');
      dataCache.invalidatePattern('group');
      dataCache.invalidatePattern('proposal');
      dataCache.invalidatePattern('schedule');

      return backendData || {

        success: true,
        message: 'Research progress archived successfully. Group members and accounts are preserved.',
        workspaceId,
        groupId,
      };
    } catch (fallbackErr) {
      console.error('[researchWorkspaceService] Firestore archive fallback error:', fallbackErr);
      if (backendSuccess) return backendData;
      throw fallbackErr;
    }
  },
  /**
   * Get or create a manuscript workspace for an accepted Adviser Request
   */
  async getOrCreateWorkspaceForAdviserRequest(
    request: AdviserRequest,
    userProfile?: any
  ): Promise<ManuscriptWorkspace> {
    // Check if an active workspace already exists for this group
    if (request.groupId) {
      const groupWs = await this.getWorkspaceByStudentOrGroup('', request.groupId);
      if (groupWs && isActiveWorkspace(groupWs)) {
        return groupWs;
      }
    }

    const workspaceId = `ws-${request.id}`;
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const existing = docSnap.data() as ManuscriptWorkspace;
      if (isActiveWorkspace(existing)) {
        if (request.groupId && userProfile?.uid && (!existing.memberIds || !existing.memberIds.includes(userProfile.uid))) {
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
    }

    const safeUid = request.studentId || userProfile?.uid || auth.currentUser?.uid || '';
    const safeName = request.studentName || userProfile?.fullName || auth.currentUser?.displayName || 'Student Researcher';
    const safeEmail = userProfile?.email || auth.currentUser?.email || '';

    let memberIds = [safeUid];
    let members: any[] = [{
      uid: safeUid,
      fullName: safeName,
      email: safeEmail,
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
      studentId: safeUid,
      studentName: safeName,
      groupId: request.groupId || '',
      groupName: request.groupName || 'Research Group',
      courseId: request.courseId || userProfile?.courseId || '',
      memberIds: Array.from(new Set(memberIds.filter(Boolean))),
      members,
      adviserId: request.adviserId || '',
      adviserName: request.adviserName || 'Assigned Adviser',
      department: userProfile?.department || 'Computer Studies',
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
    const groupWorkspaces = snap.docs.map((workspaceDoc) => ({
      ...workspaceDoc.data(),
      id: workspaceDoc.id,
    } as ManuscriptWorkspace));
    let hasArchivedWorkspace = groupWorkspaces.some((workspace) => !isActiveWorkspace(workspace));
    const existing = groupWorkspaces.find(isActiveWorkspace);
    if (existing) {
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
      const leaderWorkspaces = leaderSnap.docs.map((workspaceDoc) => ({
        ...workspaceDoc.data(),
        id: workspaceDoc.id,
      } as ManuscriptWorkspace));
      let leaderWs = leaderWorkspaces.find(isActiveWorkspace) || null;
      hasArchivedWorkspace ||= leaderWorkspaces.some((workspace) => !isActiveWorkspace(workspace));

      if (!leaderWs) {
        const leaderMemberQ = query(
          collection(db, COLLECTION_NAME),
          where('memberIds', 'array-contains', resolvedLeaderUid)
        );
        const leaderMemberSnap = await getDocs(leaderMemberQ);
        const leaderMemberWorkspaces = leaderMemberSnap.docs.map((workspaceDoc) => ({
          ...workspaceDoc.data(),
          id: workspaceDoc.id,
        } as ManuscriptWorkspace));
        leaderWs = leaderMemberWorkspaces.find(isActiveWorkspace) || null;
        hasArchivedWorkspace ||= leaderMemberWorkspaces.some((workspace) => !isActiveWorkspace(workspace));
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
      const activeProposals = propSnap.docs
        .map((proposalDoc) => proposalDoc.data() as TitleProposal)
        .filter((proposal) => proposal.status === 'approved' && !(proposal as TitleProposal & { isArchived?: boolean }).isArchived);
      if (activeProposals.length > 0) {
        const prop = activeProposals[0];
        if (!resolvedTitle && prop.title) resolvedTitle = prop.title;
        if (prop.id) proposalId = prop.id;
      }

      // Check adviser requests by groupId first, then fallback to leader
      let reqSnap = await getDocs(query(collection(db, 'adviser_requests'), where('groupId', '==', group.id)));
      if (reqSnap.empty && resolvedLeaderUid) {
        reqSnap = await getDocs(query(collection(db, 'adviser_requests'), where('studentId', '==', resolvedLeaderUid)));
      }
      const activeRequests = reqSnap.docs
        .map((requestDoc) => requestDoc.data() as AdviserRequest)
        .filter((request) => (request.status === 'pending' || request.status === 'accepted') && !request.isArchived);
      const acceptedRequest = activeRequests.find((request) => request.status === 'accepted');
      if (acceptedRequest) {
        const req = acceptedRequest;
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

    // A workspace can ONLY be created if the group has finished the matching process:
    // They must have an assigned/accepted adviser AND an accepted title!
    if (!resolvedAdviserId || !resolvedTitle) {
      throw new Error('Research workspace cannot be created until the group finishes adviser matching.');
    }

    const workspaceId = hasArchivedWorkspace
      ? doc(collection(db, COLLECTION_NAME)).id
      : `ws-group-${group.id}`;
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
      const activeDocs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
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
      const activeLeaderDocs = snapLeader.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
      let leaderWs = activeLeaderDocs.length === 0 ? null : activeLeaderDocs[0];

      if (!leaderWs) {
        const qLeaderMember = query(
          collection(db, COLLECTION_NAME),
          where('memberIds', 'array-contains', leaderUid)
        );
        const snapLeaderMember = await getDocs(qLeaderMember);
        const activeLeaderMemberDocs = snapLeaderMember.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
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
      const activeMemberDocs = snapMember.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
      if (activeMemberDocs.length > 0) {
        return activeMemberDocs[0];
      }

      // 4. Query by studentId (creator)
      const q = query(
        collection(db, COLLECTION_NAME),
        where('studentId', '==', studentUid)
      );
      const snap = await getDocs(q);
      const activeDocs = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
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
   * Fetch workspace that links directly to a given TipTap/OnlyOffice documentId
   */
  async getWorkspaceByDocumentId(documentId: string): Promise<ManuscriptWorkspace | null> {
    if (!documentId) return null;
    try {
      // 1. Direct document lookup to get workspaceId or groupId
      try {
        const docSnap = await getDoc(doc(db, 'documents', documentId));
        if (docSnap.exists()) {
          const docData = docSnap.data();
          if (docData?.workspaceId) {
            const ws = await this.getWorkspaceById(docData.workspaceId);
            if (ws && isActiveWorkspace(ws)) return ws;
          }
          if (docData?.groupId) {
            const ws = await this.getWorkspaceByStudentOrGroup('', docData.groupId);
            if (ws && isActiveWorkspace(ws)) return ws;
          }
          if (docData?.projectId) {
            const ws = await this.getWorkspaceById('ws-' + docData.projectId).catch(() => null);
            if (ws && isActiveWorkspace(ws)) return ws;
          }
        }
      } catch (docErr) {
        // Fallback to query
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        where('documentId', '==', documentId)
      );
      const snap = await getDocs(q);
      const activeDocs = snap.docs.map(d => ({ ...d.data(), id: d.id } as ManuscriptWorkspace)).filter(isActiveWorkspace);
      return activeDocs[0] || null;
    } catch (err) {
      console.warn('[researchWorkspaceService] getWorkspaceByDocumentId error:', err);
      return null;
    }
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

    // 1. Resolve assigned adviser if missing on workspace
    let resolvedAdviserId = ws.adviserId || '';
    let resolvedAdviserName = ws.adviserName || '';

    if (!resolvedAdviserId && ws.groupId) {
      try {
        const groupSnap = await getDoc(doc(db, 'research_groups', ws.groupId));
        if (groupSnap.exists()) {
          const gData = groupSnap.data();
          if (gData.adviserId) {
            resolvedAdviserId = gData.adviserId;
            resolvedAdviserName = gData.adviserName || resolvedAdviserName;
          }
        }
      } catch (err) {
        console.warn('[researchWorkspaceService] Group lookup fallback error:', err);
      }
    }

    if (!resolvedAdviserId) {
      try {
        const qReq = query(
          collection(db, 'adviser_requests'),
          where('status', '==', 'accepted'),
          where('groupId', '==', ws.groupId || '')
        );
        const reqSnap = await getDocs(qReq);
        if (!reqSnap.empty) {
          const rData = reqSnap.docs[0].data();
          resolvedAdviserId = rData.adviserId;
          resolvedAdviserName = rData.adviserName || resolvedAdviserName;
        }
      } catch (err) {
        console.warn('[researchWorkspaceService] Adviser request lookup error:', err);
      }
    }

    if (!resolvedAdviserId && (studentUid || ws.studentId)) {
      try {
        const userSnap = await getDoc(doc(db, 'users', studentUid || ws.studentId));
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (uData.adviserId) {
            resolvedAdviserId = uData.adviserId;
            resolvedAdviserName = uData.adviserName || resolvedAdviserName;
          }
        }
      } catch (err) {
        console.warn('[researchWorkspaceService] User adviser lookup error:', err);
      }
    }

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const updatePayload: any = {
      sections: updatedSections,
      overallProgress: newOverall,
      status: 'submitted_for_review',
      updatedAt: now,
    };
    if (resolvedAdviserId && !ws.adviserId) {
      updatePayload.adviserId = resolvedAdviserId;
      if (resolvedAdviserName) updatePayload.adviserName = resolvedAdviserName;
    }
    await updateDoc(docRef, updatePayload);

    const targetSection = updatedSections.find((s) => s.id === chapterId);
    const chapterDisplayName = targetSection?.name || `Chapter ${chapterId.replace('chapter_', '')}`;
    const senderDisplayName = studentName || ws.studentName || 'Student Researcher';

    systemActivityService
      .logActivity({
        title: `Chapter Submitted for Review`,
        description: `${senderDisplayName} submitted ${chapterDisplayName} for adviser review.`,
        category: 'workspace',
        actorRole: 'student',
        actorName: senderDisplayName,
      })
      .catch(console.warn);

    // Notify the Adviser in real time
    if (resolvedAdviserId) {
      try {
        const notifDocId = `notif-chap-sub-${workspaceId}-${chapterId}-${resolvedAdviserId}`;
        await notificationService.createNotification({
          id: notifDocId,
          userId: resolvedAdviserId,
          title: 'Chapter Submitted for Review',
          message: `${senderDisplayName} submitted ${chapterDisplayName} for checking and approval.`,
          type: 'manuscript',
          link: `/faculty/workspace/${workspaceId}`,
          linkUrl: `/faculty/workspace/${workspaceId}`,
          relatedId: workspaceId,
          relatedStudentId: studentUid || ws.studentId,
          groupId: ws.groupId || '',
          metadata: {
            workspaceId,
            chapterId,
            chapterName: chapterDisplayName,
            studentUid: studentUid || ws.studentId,
            studentName: senderDisplayName,
            researchTitle: ws.title || '',
          },
        });
      } catch (notifErr) {
        console.warn('[researchWorkspaceService] Failed to notify adviser on submitChapter:', notifErr);
      }
    }
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
    const chapterDisplayName = targetSection?.name || `Chapter ${chapterId.replace('chapter_', '')}`;
    const reviewerDisplayName = adviserName || ws.adviserName || 'Faculty Adviser';

    systemActivityService
      .logActivity({
        title: `Chapter Approved`,
        description: `${reviewerDisplayName} approved ${chapterDisplayName}. Progress is now ${newOverall}%.`,
        category: 'workspace',
        actorRole: 'adviser',
        actorName: reviewerDisplayName,
      })
      .catch(console.warn);

    // Notify Student and Group Members of chapter approval
    const recipientUids = Array.from(
      new Set([ws.studentId, ...(ws.memberIds || [])])
    ).filter(Boolean);

    await Promise.all(
      recipientUids.map((recipientUid) =>
        notificationService
          .createNotification({
            id: `notif-chap-app-${workspaceId}-${chapterId}-${recipientUid}`,
            userId: recipientUid,
            title: 'Chapter Approved',
            message: `${reviewerDisplayName} approved ${chapterDisplayName}. Progress is now ${newOverall}%.`,
            type: 'manuscript',
            link: '/research/workspace',
            linkUrl: '/research/workspace',
            relatedId: workspaceId,
            groupId: ws.groupId || '',
            metadata: {
              workspaceId,
              chapterId,
              chapterName: chapterDisplayName,
              approvedBy: reviewerDisplayName,
            },
          })
          .catch((err) => console.warn('[approveChapter] Student notification warning:', err))
      )
    );

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
    const chapterDisplayName = targetSection?.name || `Chapter ${chapterId.replace('chapter_', '')}`;
    const displayRole =
      reviewerRole === 'panelist'
        ? 'Defense Panelist'
        : reviewerRole === 'coordinator'
        ? 'Research Coordinator'
        : 'Faculty Adviser';
    const reviewerDisplayName = reviewerName || ws.adviserName || displayRole;

    systemActivityService
      .logActivity({
        title: `Revision Requested`,
        description: `${reviewerDisplayName} requested revisions for ${chapterDisplayName}: "${feedbackComment}".`,
        category: 'feedback',
        actorRole: reviewerRole,
        actorName: reviewerDisplayName,
      })
      .catch(console.warn);

    // Create research feedback entry for advisees to track and resolve
    if (feedbackComment) {
      researchFeedbackService
        .createFeedback({
          workspaceId,
          studentId: ws.studentId || '',
          authorId: reviewerUid || ws.adviserId,
          authorName: reviewerDisplayName,
          authorRole: reviewerRole,
          sectionId: chapterId,
          comment: feedbackComment,
        })
        .catch(console.warn);
    }

    // Notify Student and Group Members of requested revisions
    const recipientUids = Array.from(
      new Set([ws.studentId, ...(ws.memberIds || [])])
    ).filter(Boolean);

    await Promise.all(
      recipientUids.map((recipientUid) =>
        notificationService
          .createNotification({
            id: `notif-chap-rev-${workspaceId}-${chapterId}-${recipientUid}`,
            userId: recipientUid,
            title: 'Revision Requested for Chapter',
            message: `${reviewerDisplayName} requested revisions for ${chapterDisplayName}: "${feedbackComment}".`,
            type: 'manuscript',
            link: '/research/workspace',
            linkUrl: '/research/workspace',
            relatedId: workspaceId,
            groupId: ws.groupId || '',
            metadata: {
              workspaceId,
              chapterId,
              chapterName: chapterDisplayName,
              reviewerName: reviewerDisplayName,
              feedbackComment,
            },
          })
          .catch((err) => console.warn('[requestRevisionChapter] Student notification warning:', err))
      )
    );

    return newOverall;
  },

  /**
   * Auto-heal / sync missing notifications for submitted chapters for an adviser or admin.
   * Ensures that if advisees (like JP Empalmado) already submitted chapters, the adviser receives the notification.
   */
  async syncSubmittedChapterNotificationsForAdviser(adviserUid: string, adviserName?: string): Promise<void> {
    if (!adviserUid) return;
    try {
      // 1. Fetch workspaces directly assigned to this adviser
      let wsList = await this.getWorkspacesByAdviser(adviserUid);

      // 2. Also check all groups where this user is assigned as adviser
      try {
        const groupQ = query(
          collection(db, 'research_groups'),
          where('adviserId', '==', adviserUid)
        );
        const groupSnap = await getDocs(groupQ);
        for (const gDoc of groupSnap.docs) {
          if (!wsList.some((w) => w.groupId === gDoc.id)) {
            const extraWs = await this.getWorkspaceByStudentOrGroup('', gDoc.id);
            if (extraWs && !wsList.some((w) => w.id === extraWs.id)) {
              wsList.push(extraWs);
            }
          }
        }
      } catch (e) {}

      // 3. Advisee workspaces are fully covered by steps 1 & 2 (assigned workspaces and assigned groups)

      // 4. Fetch existing notifications of type manuscript for this adviser
      const notifQ = query(
        collection(db, 'notifications'),
        where('userId', '==', adviserUid),
        where('type', '==', 'manuscript')
      );
      const notifSnap = await getDocs(notifQ);
      const existingNotifs = notifSnap.docs.map((d) => d.data());

      // 5. Ensure notification exists for each submitted chapter
      for (const ws of wsList) {
        const submittedSections = (ws.sections || []).filter(
          (s) => s.status === 'submitted' || s.status === 'under_review'
        );

        for (const sec of submittedSections) {
          const expectedDocId = `notif-chap-sub-${ws.id}-${sec.id}-${adviserUid}`;
          const alreadyNotified = existingNotifs.some(
            (n: any) =>
              n.id === expectedDocId ||
              (n.relatedId === ws.id &&
                (n.metadata?.chapterId === sec.id ||
                  n.title?.includes(sec.name) ||
                  n.message?.includes(sec.name) ||
                  n.message?.includes(sec.id)))
          );

          if (!alreadyNotified) {
            const senderName = ws.studentName || 'Advisee';
            await notificationService.createNotification({
              id: expectedDocId,
              userId: adviserUid,
              title: 'Chapter Submitted for Review',
              message: `${senderName} submitted ${sec.name} for checking and approval.`,
              type: 'manuscript',
              link: `/faculty/workspace/${ws.id}`,
              linkUrl: `/faculty/workspace/${ws.id}`,
              relatedId: ws.id,
              relatedStudentId: ws.studentId,
              groupId: ws.groupId || '',
              metadata: {
                workspaceId: ws.id,
                chapterId: sec.id,
                chapterName: sec.name,
                studentUid: ws.studentId,
                studentName: senderName,
                researchTitle: ws.title || '',
              },
            });
          }
        }
      }
    } catch (err) {
      console.warn('[researchWorkspaceService] syncSubmittedChapterNotifications error:', err);
    }
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
          progress: s.progress || 0,
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
    dataCache.invalidatePattern('workspace');
    dataCache.invalidatePattern('group');
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
    dataCache.invalidatePattern('workspace');
    dataCache.invalidatePattern('group');
  },

};

export default researchWorkspaceService;
