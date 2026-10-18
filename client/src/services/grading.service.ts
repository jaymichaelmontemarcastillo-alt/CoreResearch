import {
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  Evaluation,
  SubmitEvaluationInput,
  ProposalEvaluation,
  SubmitProposalEvaluationInput,
  FinalDefenseEvaluation,
  SubmitFinalDefenseEvaluationInput,
} from '../types/grading.types';

const COLLECTION_NAME = 'evaluations';
const PROPOSAL_COLLECTION = 'proposal_evaluations';
const FINAL_DEFENSE_COLLECTION = 'final_evaluations';

/** Remove keys whose value is undefined so Firestore doesn't reject the write. */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const gradingService = {

  /**
   * Realtime subscription for proposal evaluations of a given workspace or group.
   */
  subscribeProposalEvaluationsByWorkspace(
    workspaceId: string,
    callback: (evals: ProposalEvaluation[]) => void,
    options?: { groupId?: string; projectId?: string; defenseId?: string; documentId?: string }
  ) {
    const unsubs: (() => void)[] = [];
    const evalMap = new Map<string, ProposalEvaluation>();

    const emit = () => {
      const list = Array.from(evalMap.values()).sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      callback(list);
    };

    const listenedFields: { field: string; val: string }[] = [];
    if (workspaceId && workspaceId.trim()) listenedFields.push({ field: 'workspaceId', val: workspaceId.trim() });
    if (options?.groupId && options.groupId !== workspaceId) listenedFields.push({ field: 'groupId', val: options.groupId });
    if (options?.defenseId) listenedFields.push({ field: 'defenseId', val: options.defenseId });
    if (options?.projectId && options.projectId !== workspaceId && options.projectId !== options.groupId) {
      listenedFields.push({ field: 'projectId', val: options.projectId });
    }
    if (options?.documentId && options.documentId !== workspaceId) {
      listenedFields.push({ field: 'documentId', val: options.documentId });
    }

    listenedFields.forEach(({ field, val }) => {
      try {
        unsubs.push(
          onSnapshot(
            query(collection(db, PROPOSAL_COLLECTION), where(field, '==', val)),
            (snap) => {
              snap.docs.forEach((d) => evalMap.set(d.id, d.data() as ProposalEvaluation));
              emit();
            },
            (err) => console.warn(`[gradingService] proposal sub ${field} error:`, err)
          )
        );
      } catch (err) {
        console.warn(`[gradingService] proposal sub ${field} init failed:`, err);
      }
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  },

  /**
   * Realtime subscription for final evaluations of a given workspace or group.
   */
  subscribeFinalDefenseEvaluationsByWorkspace(
    workspaceId: string,
    callback: (evals: FinalDefenseEvaluation[]) => void,
    options?: { groupId?: string; projectId?: string; defenseId?: string; documentId?: string }
  ) {
    const unsubs: (() => void)[] = [];
    const evalMap = new Map<string, FinalDefenseEvaluation>();

    const emit = () => {
      const list = Array.from(evalMap.values()).sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      callback(list);
    };

    const listenedFields: { field: string; val: string }[] = [];
    if (workspaceId && workspaceId.trim()) listenedFields.push({ field: 'workspaceId', val: workspaceId.trim() });
    if (options?.groupId && options.groupId !== workspaceId) listenedFields.push({ field: 'groupId', val: options.groupId });
    if (options?.defenseId) listenedFields.push({ field: 'defenseId', val: options.defenseId });
    if (options?.projectId && options.projectId !== workspaceId && options.projectId !== options.groupId) {
      listenedFields.push({ field: 'projectId', val: options.projectId });
    }
    if (options?.documentId && options.documentId !== workspaceId) {
      listenedFields.push({ field: 'documentId', val: options.documentId });
    }

    listenedFields.forEach(({ field, val }) => {
      try {
        unsubs.push(
          onSnapshot(
            query(collection(db, FINAL_DEFENSE_COLLECTION), where(field, '==', val)),
            (snap) => {
              snap.docs.forEach((d) => evalMap.set(d.id, d.data() as FinalDefenseEvaluation));
              emit();
            },
            (err) => console.warn(`[gradingService] final sub ${field} error:`, err)
          )
        );
      } catch (err) {
        console.warn(`[gradingService] final sub ${field} init failed:`, err);
      }
    });

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  },

  /**
   * Submit or update a panelist defense evaluation.
   */
  async submitEvaluation(input: SubmitEvaluationInput): Promise<Evaluation> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const { scores } = input;
    const totalScore =
      (scores.presentation || 0) +
      (scores.methodology || 0) +
      (scores.results || 0) +
      (scores.manuscriptQuality || 0);

    const evaluation: Evaluation = {
      id: docRef.id,
      ...input,
      totalScore,
      submittedAt: now,
    };
    await setDoc(docRef, evaluation);
    return evaluation;
  },

  /**
   * Fetch all evaluations submitted for a specific defense schedule.
   */
  async getEvaluationsByDefense(defenseId: string): Promise<Evaluation[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('defenseId', '==', defenseId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as Evaluation);
  },

  /**
   * Fetch an evaluation for a defense by a specific panelist.
   */
  async getEvaluationByPanelist(
    defenseId: string,
    panelistId: string
  ): Promise<Evaluation | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('defenseId', '==', defenseId),
      where('panelistId', '==', panelistId)
    );
    const querySnap = await getDocs(q);
    if (querySnap.empty) return null;
    return querySnap.docs[0].data() as Evaluation;
  },

  // ─── Proposal Defense Rubric ───────────────────────────────────────────────

  /**
   * Submit the LSPU Proposal Defense rubric evaluation.
   * Stores to 'proposal_evaluations' collection keyed by defenseId + panelistId.
   */
  async submitProposalEvaluation(
    input: SubmitProposalEvaluationInput
  ): Promise<ProposalEvaluation> {
    // Use deterministic doc ID so re-submission overwrites instead of duplicating
    const defenseKey = input.defenseId || input.workspaceId || input.groupId || 'defense';
    const docId = `${defenseKey}_${input.panelistId}`;
    const docRef = doc(db, PROPOSAL_COLLECTION, docId);
    const now = new Date().toISOString();

    const evaluation: ProposalEvaluation = {
      id: docId,
      ...input,
      defenseId: input.defenseId || defenseKey,
      submittedAt: now,
    };

    await setDoc(docRef, stripUndefined(evaluation) as ProposalEvaluation, { merge: true });

    // Touch manuscript_workspaces so any realtime listeners update immediately
    if (input.workspaceId) {
      try {
        const wsRef = doc(db, 'manuscript_workspaces', input.workspaceId);
        await updateDoc(wsRef, { updatedAt: now });
      } catch (err) {
        // Non-blocking
      }
    }

    return evaluation;
  },

  /**
   * Check if a panelist already submitted a proposal evaluation for a defense.
   */
  async getProposalEvaluationByPanelist(
    defenseId: string,
    panelistId: string
  ): Promise<ProposalEvaluation | null> {
    const docId = `${defenseId}_${panelistId}`;
    const docRef = doc(db, PROPOSAL_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as ProposalEvaluation;
  },

  /**
   * Fetch all proposal evaluations for a given defense.
   */
  async getProposalEvaluationsByDefense(
    defenseId: string
  ): Promise<ProposalEvaluation[]> {
    const q = query(
      collection(db, PROPOSAL_COLLECTION),
      where('defenseId', '==', defenseId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as ProposalEvaluation);
  },

  // ─── Final Defense Rubric ────────────────────────────────────────────────

  /**
   * Submit the LSPU Final Defense rubric evaluation.
   * Stores to 'final_evaluations' collection keyed by defenseId + panelistId.
   */
  async submitFinalDefenseEvaluation(
    input: SubmitFinalDefenseEvaluationInput
  ): Promise<FinalDefenseEvaluation> {
    const defenseKey = input.defenseId || input.workspaceId || input.groupId || 'defense';
    const docId = `${defenseKey}_${input.panelistId}`;
    const docRef = doc(db, FINAL_DEFENSE_COLLECTION, docId);
    const now = new Date().toISOString();

    const evaluation: FinalDefenseEvaluation = {
      id: docId,
      ...input,
      defenseId: input.defenseId || defenseKey,
      submittedAt: now,
    };

    await setDoc(docRef, stripUndefined(evaluation) as FinalDefenseEvaluation, { merge: true });

    // Touch manuscript_workspaces so any realtime listeners update immediately
    if (input.workspaceId) {
      try {
        const wsRef = doc(db, 'manuscript_workspaces', input.workspaceId);
        await updateDoc(wsRef, { updatedAt: now });
      } catch (err) {
        // Non-blocking
      }
    }

    return evaluation;
  },

  /**
   * Check if a panelist already submitted a final evaluation for a defense.
   */
  async getFinalDefenseEvaluationByPanelist(
    defenseId: string,
    panelistId: string
  ): Promise<FinalDefenseEvaluation | null> {
    const docId = `${defenseId}_${panelistId}`;
    const docRef = doc(db, FINAL_DEFENSE_COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as FinalDefenseEvaluation;
  },

  /**
   * Fetch all final evaluations for a given defense.
   */
  async getFinalDefenseEvaluationsByDefense(
    defenseId: string
  ): Promise<FinalDefenseEvaluation[]> {
    const q = query(
      collection(db, FINAL_DEFENSE_COLLECTION),
      where('defenseId', '==', defenseId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as FinalDefenseEvaluation);
  },

  /**
   * Fetch all proposal evaluations for a given workspace.
   */
  async getProposalEvaluationsByWorkspace(
    workspaceId: string
  ): Promise<ProposalEvaluation[]> {
    const q = query(
      collection(db, PROPOSAL_COLLECTION),
      where('workspaceId', '==', workspaceId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as ProposalEvaluation);
  },

  /**
   * Fetch all final evaluations for a given workspace.
   */
  async getFinalDefenseEvaluationsByWorkspace(
    workspaceId: string
  ): Promise<FinalDefenseEvaluation[]> {
    const q = query(
      collection(db, FINAL_DEFENSE_COLLECTION),
      where('workspaceId', '==', workspaceId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((d) => d.data() as FinalDefenseEvaluation);
  },

  /**
   * Fetch all evaluations for a group, manuscript, or workspace across all evaluation collections.
   * Matches by any relevant key: workspaceId, groupId, projectId, defenseId, or documentId.
   */
  async getEvaluationsForEntity(
    keys:
      | {
          workspaceId?: string;
          groupId?: string;
          projectId?: string;
          defenseId?: string;
          documentId?: string;
        }
      | (string | undefined | null)[]
  ): Promise<{ proposalEvaluations: ProposalEvaluation[]; finalEvaluations: FinalDefenseEvaluation[] }> {
    let ids: string[] = [];
    if (Array.isArray(keys)) {
      ids = Array.from(new Set(keys.filter(Boolean))) as string[];
    } else if (keys && typeof keys === 'object') {
      ids = Array.from(
        new Set(
          [
            keys.workspaceId,
            keys.groupId,
            keys.projectId,
            keys.defenseId,
            keys.documentId,
          ].filter(Boolean)
        )
      ) as string[];
    }
    if (ids.length === 0) return { proposalEvaluations: [], finalEvaluations: [] };

    const propMap = new Map<string, ProposalEvaluation>();
    const finalMap = new Map<string, FinalDefenseEvaluation>();

    const idSet = new Set(ids);
    const matchesId = (data: any) => {
      const matchKeys = [data.workspaceId, data.groupId, data.projectId, data.defenseId, data.documentId].filter(Boolean);
      return matchKeys.some((k) => idSet.has(k));
    };

    const queryPromises: Promise<void>[] = [];
    const fields = ['workspaceId', 'groupId', 'projectId', 'defenseId', 'documentId'];

    // Targeted queries for each candidate ID across all potential foreign key fields
    ids.forEach((id) => {
      fields.forEach((field) => {
        queryPromises.push(
          getDocs(query(collection(db, PROPOSAL_COLLECTION), where(field, '==', id)))
            .then((snap) => {
              snap.docs.forEach((d) => propMap.set(d.id, d.data() as ProposalEvaluation));
            })
            .catch(() => {})
        );
        queryPromises.push(
          getDocs(query(collection(db, FINAL_DEFENSE_COLLECTION), where(field, '==', id)))
            .then((snap) => {
              snap.docs.forEach((d) => finalMap.set(d.id, d.data() as FinalDefenseEvaluation));
            })
            .catch(() => {})
        );
      });
    });

    // Also run collection scan as fallback (e.g. for Admins/Coordinators)
    queryPromises.push(
      getDocs(collection(db, PROPOSAL_COLLECTION))
        .then((snap) => {
          snap.docs.forEach((d) => {
            const data = d.data() as ProposalEvaluation;
            if (matchesId(data)) propMap.set(d.id, data);
          });
        })
        .catch(() => {})
    );
    queryPromises.push(
      getDocs(collection(db, FINAL_DEFENSE_COLLECTION))
        .then((snap) => {
          snap.docs.forEach((d) => {
            const data = d.data() as FinalDefenseEvaluation;
            if (matchesId(data)) finalMap.set(d.id, data);
          });
        })
        .catch(() => {})
    );

    await Promise.all(queryPromises);

    const sortFn = (a: any, b: any) =>
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();

    return {
      proposalEvaluations: Array.from(propMap.values()).sort(sortFn),
      finalEvaluations: Array.from(finalMap.values()).sort(sortFn),
    };
  },

  /**
   * Fetch all proposal and final evaluations (e.g. for Admin/Coordinator Scheduling & Master Views).
   */
  async getAllEvaluations(): Promise<{ proposalEvaluations: ProposalEvaluation[]; finalEvaluations: FinalDefenseEvaluation[] }> {
    try {
      const [propSnap, finalSnap] = await Promise.all([
        getDocs(collection(db, PROPOSAL_COLLECTION)).catch(() => null),
        getDocs(collection(db, FINAL_DEFENSE_COLLECTION)).catch(() => null),
      ]);
      const proposalEvaluations: ProposalEvaluation[] = propSnap ? propSnap.docs.map((d) => d.data() as ProposalEvaluation) : [];
      const finalEvaluations: FinalDefenseEvaluation[] = finalSnap ? finalSnap.docs.map((d) => d.data() as FinalDefenseEvaluation) : [];
      return { proposalEvaluations, finalEvaluations };
    } catch (err) {
      console.warn('[gradingService] getAllEvaluations error:', err);
      return { proposalEvaluations: [], finalEvaluations: [] };
    }
  },
};

export default gradingService;
