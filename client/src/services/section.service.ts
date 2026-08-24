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
import { Section, CreateSectionInput, UpdateSectionInput } from '../types/section.types';

const COLLECTION_NAME = 'sections';

export const sectionService = {
  /**
   * Create a new section.
   */
  async createSection(input: CreateSectionInput): Promise<Section> {
    const sectionRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    
    const newSection: Section = {
      id: sectionRef.id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(sectionRef, newSection);
    return newSection;
  },

  /**
   * Fetch all sections globally.
   */
  async getAllSections(): Promise<Section[]> {
    const q = query(collection(db, COLLECTION_NAME));
    const querySnap = await getDocs(q);
    const sections = querySnap.docs.map((docSnap) => docSnap.data() as Section);
    return sections.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Fetch sections by course ID.
   */
  async getSectionsByCourseId(courseId: string): Promise<Section[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('courseId', '==', courseId)
    );
    // Note: To use orderBy with where, an index might be required in Firestore.
    // For simplicity, we fetch and sort on the client, or just let it return unordered if no index.
    const querySnap = await getDocs(q);
    const sections = querySnap.docs.map((docSnap) => docSnap.data() as Section);
    // Client-side sort by name
    return sections.sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * Update a section record.
   */
  async updateSection(id: string, updates: UpdateSectionInput): Promise<void> {
    const sectionRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(sectionRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a section.
   */
  async deleteSection(id: string): Promise<void> {
    const sectionRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(sectionRef);
  },
};

export default sectionService;
