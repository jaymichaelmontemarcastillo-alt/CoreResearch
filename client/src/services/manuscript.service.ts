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
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  ManuscriptVersion,
  UploadManuscriptInput,
  ManuscriptStatus,
  ManuscriptComment,
} from '../types/manuscript.types';

const COLLECTION_NAME = 'manuscript_versions';

import api from './api';

export const manuscriptService = {
  /**
   * Fetch all manuscripts for Admin & Coordinators (supports all statuses)
   * Connects directly to real manuscript versions, student workspaces, and actual panelist defense evaluations.
   */
  async getAllAdminManuscripts(): Promise<ManuscriptVersion[]> {
    let apiList: ManuscriptVersion[] = [];
    try {
      const res = await api.get('/manuscripts/admin/all');
      if (res.data && Array.isArray(res.data.data)) {
        apiList = res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] API fetch fallback to Firestore:', err);
    }

    let firestoreList: ManuscriptVersion[] = [];
    try {
      const [versionsSnap, wsSnap] = await Promise.all([
        getDocs(collection(db, COLLECTION_NAME)).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'manuscript_workspaces')).catch(() => ({ docs: [] })),
      ]);

      const versionItems = versionsSnap.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ManuscriptVersion)
      );

      const workspaceItems = wsSnap.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          projectId: data.projectId || data.proposalId || docSnap.id,
          projectTitle: data.title,
          title: data.title,
          authors:
            data.members?.map((m: any) => m.fullName) ||
            (data.studentName ? [data.studentName] : ['Student Researcher']),
          uploaderName: data.studentName || 'Student Group',
          uploadedBy: data.studentId || '',
          adviserName: data.adviserName || 'Assigned Adviser',
          adviserId: data.adviserId,
          department: data.department || 'Computer Studies',
          program: data.program || 'BSIT',
          section: data.section || '',
          versionNumber: 'v1.0',
          fileUrl: data.fileUrl || '',
          fileName: data.fileName || '',
          fileSize: data.fileSize || 0,
          abstract: data.abstract || '',
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          status: data.status === 'completed' ? 'approved' : data.status || 'under_review',
          isArchived: Boolean(data.isArchived),
          isBestThesis: Boolean(data.isBestThesis),
          bestThesisNotes: data.bestThesisNotes || '',
          grade: data.grade || null,
          sections: data.sections || [],
          groupId: data.groupId,
          documentId: data.documentId,
          commentsCount: data.commentsCount || 0,
          comments: data.comments || [],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString(),
        } as ManuscriptVersion;
      });

      firestoreList = [...versionItems, ...workspaceItems];
    } catch (fsErr) {
      console.warn('[manuscriptService] Firestore fallback error:', fsErr);
    }

    // Merge API & Firestore items without dummy mock items (no ms-101..107 or proj-501..507)
    const manuscriptMap = new Map<string, ManuscriptVersion>();
    const isMockId = (id?: string) =>
      !id || id.startsWith('ms-10') || id.startsWith('proj-50') || id.startsWith('comm-10') || id.startsWith('comm-20');

    [...apiList, ...firestoreList].forEach((m) => {
      if (!m || isMockId(m.id) || isMockId(m.projectId)) return;
      if (!m.title || m.title.trim() === '') return;
      manuscriptMap.set(m.id, m);
    });

    const combinedList = Array.from(manuscriptMap.values());

    // Retrieve real defense evaluations from panelist defense collections
    try {
      const [finalSnap, propSnap, evalSnap] = await Promise.all([
        getDocs(collection(db, 'final_evaluations')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'proposal_evaluations')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'evaluations')).catch(() => ({ docs: [] })),
      ]);

      const finalEvalsByWs = new Map<string, any[]>();
      finalSnap.docs.forEach((d: any) => {
        const ev = d.data();
        const keys = [ev.workspaceId, ev.projectId, ev.defenseId].filter(Boolean);
        keys.forEach((k) => {
          if (!finalEvalsByWs.has(k)) finalEvalsByWs.set(k, []);
          finalEvalsByWs.get(k)!.push(ev);
        });
      });

      const propEvalsByWs = new Map<string, any[]>();
      propSnap.docs.forEach((d: any) => {
        const ev = d.data();
        const keys = [ev.workspaceId, ev.projectId, ev.defenseId].filter(Boolean);
        keys.forEach((k) => {
          if (!propEvalsByWs.has(k)) propEvalsByWs.set(k, []);
          propEvalsByWs.get(k)!.push(ev);
        });
      });

      const genericEvalsByWs = new Map<string, any[]>();
      evalSnap.docs.forEach((d: any) => {
        const ev = d.data();
        const keys = [ev.projectId, ev.defenseId].filter(Boolean);
        keys.forEach((k) => {
          if (!genericEvalsByWs.has(k)) genericEvalsByWs.set(k, []);
          genericEvalsByWs.get(k)!.push(ev);
        });
      });

      // Attach actual panelist defense evaluations to each manuscript
      combinedList.forEach((m) => {
        const keysToSearch = [m.id, m.projectId, m.groupId].filter(Boolean) as string[];

        let finals: any[] = [];
        let props: any[] = [];
        let generics: any[] = [];

        keysToSearch.forEach((k) => {
          if (finalEvalsByWs.has(k)) finals.push(...finalEvalsByWs.get(k)!);
          if (propEvalsByWs.has(k)) props.push(...propEvalsByWs.get(k)!);
          if (genericEvalsByWs.has(k)) generics.push(...genericEvalsByWs.get(k)!);
        });

        // Deduplicate evaluations by ID
        finals = Array.from(new Map(finals.map((e) => [e.id || `${e.panelistId}_${e.defenseId}`, e])).values());
        props = Array.from(new Map(props.map((e) => [e.id || `${e.panelistId}_${e.defenseId}`, e])).values());
        generics = Array.from(new Map(generics.map((e) => [e.id || `${e.panelistId}_${e.defenseId}`, e])).values());

        if (finals.length > 0) {
          const totalScores = finals.map((f) => f.subTotals?.overall || f.totalScore || 0);
          const avgScore = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length);
          const latestVerdict = finals[0].verdict ? String(finals[0].verdict).replace(/_/g, ' ') : 'Passed';
          m.grade = {
            score: avgScore,
            letter: `${latestVerdict} (Final Defense)`,
            remarks: finals[0].remarks || `Evaluated by ${finals.length} defense panelist(s).`,
            panelistEvaluations: finals,
            defenseType: 'final',
            updatedAt: finals[0].submittedAt || new Date().toISOString(),
          };
        } else if (props.length > 0) {
          const totalScores = props.map((p) => p.subTotals?.overall || p.totalScore || 0);
          const avgScore = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length);
          const latestVerdict = props[0].verdict ? String(props[0].verdict).replace(/_/g, ' ') : 'Approved';
          m.grade = {
            score: avgScore,
            letter: `${latestVerdict} (Proposal Defense)`,
            remarks: props[0].remarks || `Evaluated by ${props.length} proposal panelist(s).`,
            panelistEvaluations: props,
            defenseType: 'proposal',
            updatedAt: props[0].submittedAt || new Date().toISOString(),
          };
        } else if (generics.length > 0) {
          const totalScores = generics.map((g) => g.totalScore || 0);
          const avgScore = Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length);
          m.grade = {
            score: avgScore,
            letter: avgScore >= 75 ? 'Passed Defense' : 'Conditional Re-defense',
            remarks: generics[0].remarks || `Graded by ${generics.length} panel member(s).`,
            panelistEvaluations: generics,
            defenseType: 'defense',
            updatedAt: generics[0].submittedAt || new Date().toISOString(),
          };
        } else {
          // No panelist defense evaluations submitted yet
          m.grade = undefined;
        }
      });
    } catch (evalErr) {
      console.warn('[manuscriptService] Defense grading query fallback:', evalErr);
    }

    return combinedList.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  },

  /**
   * Admin update manuscript metadata (Title, Abstract, Authors, Status, etc.)
   */
  async adminUpdateManuscript(id: string, updates: Partial<ManuscriptVersion>): Promise<ManuscriptVersion> {
    try {
      const res = await api.patch(`/manuscripts/${id}/admin-update`, updates);
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] adminUpdateManuscript API fallback:', err);
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
    const snap = await getDoc(docRef);
    return snap.data() as ManuscriptVersion;
  },

  /**
   * Update or evaluate manuscript grade (with criteria rubric)
   */
  async updateManuscriptGrade(
    id: string,
    gradeData: { score: number; letter?: string; remarks?: string; criteria?: any }
  ): Promise<ManuscriptVersion> {
    try {
      const res = await api.patch(`/manuscripts/${id}/grade`, gradeData);
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] updateManuscriptGrade API fallback:', err);
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { grade: gradeData, updatedAt: new Date().toISOString() });
    const snap = await getDoc(docRef);
    return snap.data() as ManuscriptVersion;
  },

  /**
   * Toggle archive status of a manuscript
   */
  async toggleArchiveManuscript(id: string, isArchived?: boolean): Promise<ManuscriptVersion> {
    try {
      const res = await api.patch(`/manuscripts/${id}/archive`, { isArchived });
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] toggleArchiveManuscript API fallback:', err);
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    const current = snap.data() as ManuscriptVersion;
    const nextArchive = isArchived !== undefined ? isArchived : !current?.isArchived;
    await updateDoc(docRef, {
      isArchived: nextArchive,
      status: nextArchive ? 'archived' : (current?.status === 'archived' ? 'approved' : current?.status || 'approved'),
      updatedAt: new Date().toISOString()
    });
    const refreshed = await getDoc(docRef);
    return refreshed.data() as ManuscriptVersion;
  },

  /**
   * Select or toggle Best Thesis designation
   */
  async toggleBestThesis(id: string, isBestThesis?: boolean, notes?: string): Promise<ManuscriptVersion> {
    try {
      const res = await api.patch(`/manuscripts/${id}/best-thesis`, { isBestThesis, notes });
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] toggleBestThesis API fallback:', err);
    }

    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    const current = snap.data() as ManuscriptVersion;
    const nextBest = isBestThesis !== undefined ? isBestThesis : !current?.isBestThesis;
    await updateDoc(docRef, {
      isBestThesis: nextBest,
      bestThesisNotes: nextBest ? (notes || current?.bestThesisNotes || 'Selected as Best Thesis.') : '',
      updatedAt: new Date().toISOString()
    });
    const refreshed = await getDoc(docRef);
    return refreshed.data() as ManuscriptVersion;
  },

  /**
   * Add comments / feedback to a manuscript
   */
  async addFeedback(id: string, text: string, section?: string): Promise<ManuscriptVersion> {
    try {
      const res = await api.post(`/manuscripts/${id}/feedback`, { text, section });
      if (res.data && res.data.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[manuscriptService] addFeedback API fallback:', err);
    }

    const newComment = {
      id: `comm-${Date.now()}`,
      authorName: 'Admin Reviewer',
      authorRole: 'admin',
      text,
      section: section || 'General',
      createdAt: new Date().toISOString()
    };
    await this.addComment(id, newComment as any);
    const refreshed = await this.getManuscriptById(id);
    return refreshed as ManuscriptVersion;
  },

  /**
   * Publish manuscript to Institutional Repository
   */
  async publishToRepository(id: string): Promise<any> {
    try {
      const res = await api.post(`/manuscripts/${id}/publish-repository`);
      return res.data;
    } catch (err) {
      console.warn('[manuscriptService] publishToRepository error:', err);
      throw err;
    }
  },

  /**
   * Create a new manuscript version document.
   */
  async createManuscriptVersion(input: UploadManuscriptInput): Promise<ManuscriptVersion> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const newManuscript: ManuscriptVersion = {
      id: docRef.id,
      ...input,
      commentsCount: 0,
      comments: [],
      status: 'under_review',
      createdAt: now,
    };
    await setDoc(docRef, newManuscript);
    return newManuscript;
  },

  /**
   * Fetch all manuscript versions for a specific research project.
   */
  async getManuscriptsByProject(projectId: string): Promise<ManuscriptVersion[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('projectId', '==', projectId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ManuscriptVersion);
  },

  /**
   * Fetch a manuscript version by ID.
   */
  async getManuscriptById(id: string): Promise<ManuscriptVersion | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ManuscriptVersion;
  },

  /**
   * Update manuscript status.
   */
  async updateManuscriptStatus(id: string, status: ManuscriptStatus): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
  },

  /**
   * Add a review comment to a manuscript version.
   */
  async addComment(manuscriptId: string, comment: ManuscriptComment): Promise<void> {
    const manuscript = await this.getManuscriptById(manuscriptId);
    if (!manuscript) throw new Error('Manuscript not found');

    const comments = [...(manuscript.comments || []), comment];
    const docRef = doc(db, COLLECTION_NAME, manuscriptId);
    await updateDoc(docRef, {
      comments,
      commentsCount: comments.length,
    });
  },

  /**
   * Delete a manuscript record.
   */
  async deleteManuscript(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  /**
   * Delete multiple manuscripts (Admin)
   */
  async deleteAdminManuscripts(ids: string[]): Promise<void> {
    try {
      await api.delete('/manuscripts/admin/delete', { data: { ids } });
    } catch (err) {
      console.warn('[manuscriptService] deleteAdminManuscripts API fallback:', err);
      // Fallback: delete from firestore directly if the API isn't available
      for (const id of ids) {
        await this.deleteManuscript(id);
      }
    }
  }
};

export default manuscriptService;
