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

let coursesCache: Course[] | null = null;

export const courseService = {
  /**
   * Create a new course.
   */
  async createCourse(input: CreateCourseInput): Promise<Course> {
    // Generate an ID similar to how seed data is created (e.g. 'bsit')
    const id = input.code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const courseRef = doc(db, COLLECTION_NAME, id);
    
    // Check if exists
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
    return newCourse;
  },

  /**
   * Fetch a single course by ID.
   */
  async getCourseById(id: string): Promise<Course | null> {
    if (coursesCache) {
      const found = coursesCache.find(c => c.id === id);
      if (found) return found;
    }
    const courseRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(courseRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as Course;
  },

  /**
   * Fetch all courses.
   */
  async getAllCourses(forceRefresh = false): Promise<Course[]> {
    if (coursesCache && !forceRefresh) {
      return coursesCache;
    }
    const q = query(collection(db, COLLECTION_NAME), orderBy('name', 'asc'));
    const querySnap = await getDocs(q);
    coursesCache = querySnap.docs.map((docSnap) => docSnap.data() as Course);
    return coursesCache;
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
