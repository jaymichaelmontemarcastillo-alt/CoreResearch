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
   * Helper to normalize a section object so it has a clean name and valid specialization mapping
   */
  normalizeSection(id: string, s: any): Section {
    const rawName = s.name || '';
    const cleanName = rawName.replace(/^Section\s+/i, '').trim() || rawName;
    const courseId = (s.courseId || '').toLowerCase();
    let specializationId = s.specializationId ? s.specializationId.toLowerCase() : undefined;

    // For BSCS, if no specializationId is explicitly set, map to 'is' (Intelligent Systems)
    if (courseId === 'bscs' && !specializationId) {
      specializationId = 'is';
    }

    return {
      ...s,
      id: id || s.id,
      name: cleanName,
      courseId,
      specializationId,
      active: s.active !== false,
      createdAt: s.createdAt || new Date().toISOString(),
    };
  },

  /**
   * Helper to normalize section name removing any old year level prefix (e.g. "3A" -> "A")
   */
  normalizeSectionName(name: string): string {
    if (!name) return '';
    const trimmed = name.replace(/^Section\s+/i, '').trim().toUpperCase();
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
      const sections = querySnap.docs.map((docSnap) =>
        this.normalizeSection(docSnap.id, docSnap.data())
      );
      return sections.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.warn('[sectionService] getAllSections error:', err);
      return [];
    }
  },

  /**
   * Fetch sections by course ID.
   * Seamlessly resolves case-insensitivity and ensures fallback data is aligned.
   */
  async getSectionsByCourseId(courseId: string, activeOnly = false): Promise<Section[]> {
    if (!courseId) return [];
    const targetCourse = courseId.toLowerCase().trim();

    try {
      const all = await this.getAllSections();
      let sections = all.filter(
        (s) => s.courseId?.toLowerCase() === targetCourse
      );

      if (activeOnly) {
        sections = sections.filter((s) => s.active !== false);
      }

      if (sections.length > 0) {
        return sections.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Default baseline admin sections (A, B) if database has not been seeded yet
      return [
        { id: `${targetCourse}-sec-a`, courseId: targetCourse, name: 'A', specializationId: targetCourse === 'bscs' ? 'is' : 'wmad', active: true, createdAt: new Date().toISOString() },
        { id: `${targetCourse}-sec-b`, courseId: targetCourse, name: 'B', specializationId: targetCourse === 'bscs' ? 'is' : 'wmad', active: true, createdAt: new Date().toISOString() },
      ];
    } catch (err) {
      console.warn('[sectionService] getSectionsByCourseId error:', err);
      return [
        { id: `${targetCourse}-sec-a`, courseId: targetCourse, name: 'A', specializationId: targetCourse === 'bscs' ? 'is' : 'wmad', active: true, createdAt: new Date().toISOString() },
        { id: `${targetCourse}-sec-b`, courseId: targetCourse, name: 'B', specializationId: targetCourse === 'bscs' ? 'is' : 'wmad', active: true, createdAt: new Date().toISOString() },
      ];
    }
  },

  /**
   * Fetch sections by specialization ID.
   */
  async getSectionsBySpecializationId(courseId: string, specId: string, activeOnly = false): Promise<Section[]> {
    const courseSecs = await this.getSectionsByCourseId(courseId, activeOnly);
    if (!specId) return courseSecs;
    const targetSpec = specId.toLowerCase().trim();
    return courseSecs.filter(
      (s) => s.specializationId?.toLowerCase() === targetSpec || !s.specializationId
    );
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
