import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { Course, CreateCourseInput, UpdateCourseInput } from '../types/course.types';

const COLLECTION_NAME = 'courses';

export const BSIT_SPECIALIZATIONS: Specialization[] = [
  { id: 'wmad', code: 'WMAD', name: 'Web and Mobile Application Development' },
  { id: 'amg', code: 'AMG', name: 'Animation and Motion Graphics' },
  { id: 'smp', code: 'SMP', name: 'Service Management Program' },
];

export const DEFAULT_PROGRAMS: Course[] = [
  {
    id: 'bsit',
    code: 'BSIT',
    name: 'Bachelor of Science in Information Technology',
    departmentId: 'it',
    active: true,
    specializations: BSIT_SPECIALIZATIONS,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bscs',
    code: 'BSCS',
    name: 'Bachelor of Science in Computer Science',
    departmentId: 'cs',
    active: true,
    specializations: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bsis',
    code: 'BSIS',
    name: 'Bachelor of Science in Information Systems',
    departmentId: 'is',
    active: true,
    specializations: [],
    createdAt: new Date().toISOString(),
  },
];

const enrichCourseWithMajors = (course: Course): Course => {
  if (course.code?.toUpperCase() === 'BSIT' || course.id?.toLowerCase() === 'bsit') {
    return {
      ...course,
      specializations: (course.specializations && course.specializations.length > 0)
        ? course.specializations
        : BSIT_SPECIALIZATIONS,
    };
  }
  return course;
};

let coursesCache: Course[] | null = null;

export const courseService = {
  /**
   * Create a new course.
   */
  async createCourse(input: CreateCourseInput): Promise<Course> {
    const id = input.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const courseRef = doc(db, COLLECTION_NAME, id);
    
    const docSnap = await getDoc(courseRef);
    if (docSnap.exists()) {
      throw new Error(`Course with code ${input.code} already exists.`);
    }

    const now = new Date().toISOString();
    const newCourse: Course = {
      id,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    
    await setDoc(courseRef, newCourse);
    coursesCache = null; // Invalidate cache
    return enrichCourseWithMajors(newCourse);
  },

  /**
   * Fetch a single course by ID.
   */
  async getCourseById(id: string): Promise<Course | null> {
    if (coursesCache) {
      const found = coursesCache.find(c => c.id === id);
      if (found) return enrichCourseWithMajors(found);
    }
    try {
      const courseRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(courseRef);
      if (!docSnap.exists()) {
        const fallback = DEFAULT_PROGRAMS.find(p => p.id === id || p.code.toLowerCase() === id.toLowerCase());
        return fallback ? enrichCourseWithMajors(fallback) : null;
      }
      return enrichCourseWithMajors(docSnap.data() as Course);
    } catch (err) {
      const fallback = DEFAULT_PROGRAMS.find(p => p.id === id || p.code.toLowerCase() === id.toLowerCase());
      return fallback ? enrichCourseWithMajors(fallback) : null;
    }
  },

  /**
   * Fetch all courses.
   */
  async getAllCourses(forceRefresh = false): Promise<Course[]> {
    if (coursesCache && !forceRefresh) {
      return coursesCache;
    }
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
      const querySnap = await getDocs(q);
      const courses = querySnap.docs.map((docSnap) => enrichCourseWithMajors(docSnap.data() as Course));
      coursesCache = courses.length > 0 ? courses : DEFAULT_PROGRAMS.map(enrichCourseWithMajors);
      return coursesCache;
    } catch (err) {
      console.warn('[courseService] Falling back to default programs:', err);
      coursesCache = DEFAULT_PROGRAMS.map(enrichCourseWithMajors);
      return coursesCache;
    }
  },

  /**
   * Update a course record.
   */
  async updateCourse(id: string, updates: UpdateCourseInput): Promise<void> {
    const courseRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(courseRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  /**
   * Delete a course.
   */
  async deleteCourse(id: string): Promise<void> {
    const courseRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(courseRef);
  },
};

export default courseService;
