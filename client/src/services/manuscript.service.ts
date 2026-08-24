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

export const manuscriptService = {
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
};

export default manuscriptService;
