// src/services/researchFeedback.service.ts
import {
  doc,
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
  ResearchFeedback,
  CreateFeedbackInput,
  FeedbackStatus,
} from '../types/researchWorkspace.types';

const COLLECTION_NAME = 'research_feedback';

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

export const researchFeedbackService = {
  /**
   * Create a new research feedback entry
   */
  async createFeedback(input: CreateFeedbackInput): Promise<ResearchFeedback> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();

    const newFeedback: ResearchFeedback = {
      id: docRef.id,
      workspaceId: input.workspaceId,
      studentId: input.studentId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorRole: input.authorRole,
      sectionId: input.sectionId,
      taskId: input.taskId,
      comment: input.comment.trim(),
      status: 'open',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(docRef, stripUndefined(newFeedback) as ResearchFeedback);
    return newFeedback;
  },

  /**
   * Fetch all feedback for a workspace
   */
  async getFeedbackByWorkspace(workspaceId: string): Promise<ResearchFeedback[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('workspaceId', '==', workspaceId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ResearchFeedback);
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Real-time subscription to workspace feedback
   */
  subscribeWorkspaceFeedback(
    workspaceId: string,
    onUpdate: (feedbackList: ResearchFeedback[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('workspaceId', '==', workspaceId)
    );
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as ResearchFeedback);
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        onUpdate(list);
      },
      (err) => {
        console.warn('[researchFeedbackService] subscribe error:', err);
        if (onError) onError(err);
      }
    );
  },

  /**
   * Update feedback status (e.g., student marks as 'addressed' or adviser marks as 'resolved')
   */
  async updateFeedbackStatus(
    feedbackId: string,
    status: FeedbackStatus
  ): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, feedbackId);
    await updateDoc(docRef, {
      status,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a feedback entry
   */
  async deleteFeedback(feedbackId: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, feedbackId);
    await deleteDoc(docRef);
  },
};

export default researchFeedbackService;
