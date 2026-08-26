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
import api from './api';
import {
  DefenseSchedule,
  CreateScheduleInput,
  ScheduleStatus,
} from '../types/schedule.types';

const COLLECTION_NAME = 'schedules';

export const scheduleService = {
  /**
   * Create a new defense schedule.
   */
  async createSchedule(input: CreateScheduleInput): Promise<DefenseSchedule> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const newSchedule: DefenseSchedule = {
      id: docRef.id,
      ...input,
      status: 'scheduled',
      createdAt: now,
    };
    await setDoc(docRef, newSchedule);
    return newSchedule;
  },

  /**
   * Fetch a defense schedule by ID.
   */
  async getScheduleById(id: string): Promise<DefenseSchedule | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data() as DefenseSchedule;
  },

  /**
   * Fetch all defense schedules.
   */
  async getAllSchedules(): Promise<DefenseSchedule[]> {
    const q = query(collection(db, COLLECTION_NAME), orderBy('date', 'asc'));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as DefenseSchedule);
  },

  /**
   * Fetch defense schedules for a specific project.
   */
  async getSchedulesByProject(projectId: string): Promise<DefenseSchedule[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('projectId', '==', projectId)
    );
    const querySnap = await getDocs(q);
    return querySnap.docs.map((docSnap) => docSnap.data() as DefenseSchedule);
  },

  /**
   * Update full schedule (Admin only)
   */
  async updateSchedule(scheduleId: string, updates: Partial<DefenseSchedule>): Promise<DefenseSchedule> {
    const { data } = await api.put(`/schedules/${scheduleId}`, updates);
    return data.data;
  },

  /**
   * Update schedule status (Admin & Adviser)
   */
  async updateScheduleStatus(id: string, status: ScheduleStatus): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { status });
  },

  /**
   * Delete a defense schedule.
   */
  async deleteSchedule(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  /**
   * Generate schedule preview using Node API
   */
  async generateSchedulePreview(payload: { groups: any[], config: any }) {
    const response = await api.post('/schedules/preview', payload);
    return response.data.data;
  },

  /**
   * Bulk create schedules using Node API
   */
  async bulkCreateSchedules(schedules: any[]) {
    const response = await api.post('/schedules/bulk', { schedules });
    return response.data;
  }
};

export default scheduleService;
