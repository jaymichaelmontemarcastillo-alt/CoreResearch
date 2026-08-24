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
  ResearchProject,
  CreateGroupInput,
  UpdateGroupInput,
} from '../types/researchGroup.types';

const COLLECTION_NAME = 'research_projects';

export const researchGroupService = {
  /**
   * Create a new research project/group record.
   */
  async createResearchGroup(input: CreateGroupInput): Promise<ResearchProject> {
    const groupRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const newGroup: ResearchProject = {
      id: groupRef.id,
      ...input,
      panelistIds: input.panelistIds || [],
      members: input.members || [],
      status: 'in_progress',
      createdAt: now,
      updatedAt: now,
    };
    await setDoc(groupRef, newGroup);
    return newGroup;
  },

  /**
   * Fetch research project by ID.
   */
  async getResearchGroupById(id: string): Promise<ResearchProject | null> {
    const groupRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(groupRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as ResearchProject;
  },

  /**
   * Fetch all research projects.
   */
  async getAllResearchGroups(): Promise<ResearchProject[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ResearchProject);
  },

  /**
   * Fetch research projects by student ID.
   */
  async getGroupsByStudent(studentId: string): Promise<ResearchProject[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('studentId', '==', studentId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ResearchProject);
  },

  /**
   * Fetch research projects assigned to an adviser.
   */
  async getGroupsByAdviser(adviserId: string): Promise<ResearchProject[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('adviserId', '==', adviserId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as ResearchProject);
  },

  /**
   * Update a research project record.
   */
  async updateResearchGroup(id: string, updates: UpdateGroupInput): Promise<void> {
    const groupRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(groupRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a research project record.
   */
  async deleteResearchGroup(id: string): Promise<void> {
    const groupRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(groupRef);
  },
};

export default researchGroupService;
