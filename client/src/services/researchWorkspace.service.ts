// src/services/researchWorkspace.service.ts
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
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
import { TitleProposal } from '../types/proposal.types';
import { UserProfile } from '../types/user.types';
import progressService from './progress.service';

const COLLECTION_NAME = 'manuscript_workspaces';

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const researchWorkspaceService = {
  /**
   * Get or create a manuscript workspace for an approved proposal / group
   */
  async getOrCreateWorkspaceForProposal(
    proposal: TitleProposal,
    userProfile: UserProfile,
    adviserInfo?: { id: string; name: string }
  ): Promise<ManuscriptWorkspace> {
    const workspaceId = `ws-${proposal.id}`;
    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as ManuscriptWorkspace;
    }

    const now = new Date().toISOString();
    const newWorkspace: ManuscriptWorkspace = {
      id: workspaceId,
      proposalId: proposal.id,
      title: proposal.title || 'Research Manuscript',
      studentId: proposal.submittedByUid || userProfile.uid,
      studentName: proposal.submittedByName || userProfile.fullName || 'Student Researcher',
      groupId: proposal.groupId || '',
      groupName: proposal.groupName || 'Research Group',
      adviserId: adviserInfo?.id || proposal.coordinatorId || '',
      adviserName: adviserInfo?.name || proposal.coordinatorName || 'Assigned Adviser',
      department: userProfile.department || 'Computer Studies',
      status: 'in_progress',
      sections: DEFAULT_MANUSCRIPT_SECTIONS,
      overallProgress: 20, // Base progress for approved proposal + setup
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newWorkspace) as ManuscriptWorkspace);
    return newWorkspace;
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
   * Fetch workspace by Student UID or Group ID
   */
  async getWorkspaceByStudentOrGroup(
    studentUid: string,
    groupId?: string
  ): Promise<ManuscriptWorkspace | null> {
    if (groupId) {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as ManuscriptWorkspace;
      }
    }

    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentUid)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as ManuscriptWorkspace;
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

    const newOverall = progressService.calculateOverallProgress({
      ...ws,
      sections: updatedSections,
    });

    const docRef = doc(db, COLLECTION_NAME, workspaceId);
    await updateDoc(docRef, {
      sections: updatedSections,
      overallProgress: newOverall,
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
};

export default researchWorkspaceService;
