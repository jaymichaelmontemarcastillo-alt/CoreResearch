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
   * Helper to normalize section name removing any old year level prefix (e.g. "3A" -> "A")
   */
  normalizeSectionName(name: string): string {
    if (!name) return '';
    const trimmed = name.trim().toUpperCase();
    const match = trimmed.match(/^[1-5]?([A-Z])$/);
    if (match) return match[1];
    return trimmed;
  },

  /**
   * Fetch all sections globally.
   */
  async getAllSections(): Promise<Section[]> {
    try {
      const q = query(collection(db, COLLECTION_NAME));
      const querySnap = await getDocs(q);
      const sections = querySnap.docs.map((docSnap) => docSnap.data() as Section);
      return sections.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.warn('[sectionService] getAllSections error:', err);
      return [];
    }
  },

  /**
   * Fetch sections by course ID.
   * If none are configured in Firestore yet, returns default section letters (A, B, C).
   */
  async getSectionsByCourseId(courseId: string, activeOnly = false): Promise<Section[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('courseId', '==', courseId)
      );
      const querySnap = await getDocs(q);
      let sections = querySnap.docs.map((docSnap) => docSnap.data() as Section);

      if (activeOnly) {
        sections = sections.filter(s => s.active !== false);
      }

      if (sections.length > 0) {
        return sections.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Default baseline admin sections (A, B, C) if database has not been seeded yet
      return [
        { id: `${courseId}-sec-a`, courseId, name: 'A', active: true, createdAt: new Date().toISOString() },
        { id: `${courseId}-sec-b`, courseId, name: 'B', active: true, createdAt: new Date().toISOString() },
        { id: `${courseId}-sec-c`, courseId, name: 'C', active: true, createdAt: new Date().toISOString() },
      ];
    } catch (err) {
      console.warn('[sectionService] getSectionsByCourseId error:', err);
      return [
        { id: `${courseId}-sec-a`, courseId, name: 'A', active: true, createdAt: new Date().toISOString() },
        { id: `${courseId}-sec-b`, courseId, name: 'B', active: true, createdAt: new Date().toISOString() },
        { id: `${courseId}-sec-c`, courseId, name: 'C', active: true, createdAt: new Date().toISOString() },
      ];
    }
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
