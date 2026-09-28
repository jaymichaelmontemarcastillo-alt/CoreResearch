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
   * Realtime subscription for proposal evaluations of a given workspace.
   */
  subscribeProposalEvaluationsByWorkspace(workspaceId: string, callback: (evals: ProposalEvaluation[]) => void) {
    const q = query(
      collection(db, PROPOSAL_COLLECTION),
      where('workspaceId', '==', workspaceId)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as ProposalEvaluation));
    });
  },

  /**
   * Realtime subscription for final evaluations of a given workspace.
   */
  subscribeFinalDefenseEvaluationsByWorkspace(workspaceId: string, callback: (evals: FinalDefenseEvaluation[]) => void) {
    const q = query(
      collection(db, FINAL_DEFENSE_COLLECTION),
      where('workspaceId', '==', workspaceId)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as FinalDefenseEvaluation));
    });
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
    const docId = `${input.defenseId}_${input.panelistId}`;
    const docRef = doc(db, PROPOSAL_COLLECTION, docId);
    const now = new Date().toISOString();

    const evaluation: ProposalEvaluation = {
      id: docId,
      ...input,
      submittedAt: now,
    };

    await setDoc(docRef, stripUndefined(evaluation) as ProposalEvaluation, { merge: true });
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
    const docId = `${input.defenseId}_${input.panelistId}`;
    const docRef = doc(db, FINAL_DEFENSE_COLLECTION, docId);
    const now = new Date().toISOString();

    const evaluation: FinalDefenseEvaluation = {
      id: docId,
      ...input,
      submittedAt: now,
    };

    await setDoc(docRef, stripUndefined(evaluation) as FinalDefenseEvaluation, { merge: true });
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
};

export default gradingService;
