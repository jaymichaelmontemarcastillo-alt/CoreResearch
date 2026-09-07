import { db } from '../firebase/firebase';
import { collection, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
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
    if (input.adviserId && Array.isArray(input.panelistIds) && input.panelistIds.includes(input.adviserId)) {
      throw new Error('Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.');
    }
    const { data } = await api.post('/schedules', input);
    try {
      if (data.data?.id) {
        await setDoc(doc(db, COLLECTION_NAME, data.data.id), data.data, { merge: true });
      }
    } catch (fsErr) {
      console.warn('[scheduleService] Firestore sync warning:', fsErr);
    }
    return data.data;
  },

  /**
   * Fetch a defense schedule by ID.
   */
  async getScheduleById(id: string): Promise<DefenseSchedule | null> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.find(s => s.id === id) || null;
  },

  /**
   * Fetch all defense schedules with Firestore fallback.
   */
  async getAllSchedules(): Promise<DefenseSchedule[]> {
    try {
      const { data } = await api.get('/schedules');
      if (Array.isArray(data?.data)) {
        return data.data;
      }
    } catch (apiErr) {
      console.warn('[scheduleService] API error, falling back to Firestore:', apiErr);
    }

    try {
      const snap = await getDocs(collection(db, COLLECTION_NAME));
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as DefenseSchedule));
    } catch (fsErr) {
      console.error('[scheduleService] Firestore fetch error:', fsErr);
      return [];
    }
  },

  /**
   * Fetch defense schedules for a specific project.
   */
  async getSchedulesByProject(projectId: string): Promise<DefenseSchedule[]> {
    const allSchedules = await this.getAllSchedules();
    return allSchedules.filter(s => s.projectId === projectId);
  },

  /**
   * Update full schedule (Admin only)
   */
  async updateSchedule(scheduleId: string, updates: Partial<DefenseSchedule>): Promise<DefenseSchedule> {
    if (updates.adviserId && Array.isArray(updates.panelists) && updates.panelists.some((p: any) => (p.id || p.uid) === updates.adviserId)) {
      throw new Error('Invalid Panelist Assignment: The assigned adviser of this research group cannot serve as a panelist for the same group.');
    }

    let result: any = null;
    try {
      const { data } = await api.put(`/schedules/${scheduleId}`, updates);
      result = data.data;
    } catch (apiErr) {
      console.warn('[scheduleService] API update warning, saving to Firestore:', apiErr);
    }

    try {
      await setDoc(doc(db, COLLECTION_NAME, scheduleId), updates, { merge: true });
    } catch (fsErr) {
      console.warn('[scheduleService] Firestore update error:', fsErr);
    }

    return result || ({ id: scheduleId, ...updates } as DefenseSchedule);
  },

  /**
   * Update schedule status (Admin & Adviser)
   */
  async updateScheduleStatus(id: string, status: ScheduleStatus): Promise<void> {
    try {
      await api.patch(`/schedules/${id}/status`, { status });
    } catch (apiErr) {
      console.warn('[scheduleService] API updateStatus warning:', apiErr);
    }
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { status });
    } catch (fsErr) {
      console.warn('[scheduleService] Firestore status update error:', fsErr);
    }
  },

  /**
   * Delete a defense schedule.
   */
  async deleteSchedule(id: string): Promise<void> {
    await api.delete(`/schedules/${id}`);
  },

  /**
   * Generate schedule preview using Node API
   */
  async generateSchedulePreview(payload: { groups: any[], config: any }) {
    const response = await api.post('/schedules/preview', payload);
    return response.data.data;
  },

  /**
   * Bulk create schedules using Node API with validation and Firestore sync
   */
  async bulkCreateSchedules(schedules: any[]) {
    // Validate that no group's adviser is in its panelists
    for (const s of schedules) {
      if (s.adviserId && Array.isArray(s.panelists) && s.panelists.some((p: any) => (p.id || p.uid) === s.adviserId)) {
        throw new Error(`Invalid Panelist Assignment: The assigned adviser cannot serve as a panelist for group "${s.projectTitle || s.projectId}".`);
      }
    }

    let responseData: any = null;
    try {
      const response = await api.post('/schedules/bulk', { schedules });
      responseData = response.data;
    } catch (apiErr) {
      console.warn('[scheduleService] API bulkCreate error, writing to Firestore:', apiErr);
    }

    try {
      await Promise.all(schedules.map(async (s) => {
        const id = s.id || `sch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await setDoc(doc(db, COLLECTION_NAME, id), { ...s, id }, { merge: true });
      }));
    } catch (fsErr) {
      console.warn('[scheduleService] Firestore bulk sync error:', fsErr);
    }

    return responseData || { success: true, message: `${schedules.length} schedules created.` };
  }
};

export default scheduleService;

