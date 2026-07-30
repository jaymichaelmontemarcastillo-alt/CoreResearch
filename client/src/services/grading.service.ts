import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Evaluation, SubmitEvaluationInput } from '../types/grading.types';

const COLLECTION_NAME = 'evaluations';

export const gradingService = {
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
};

export default gradingService;
