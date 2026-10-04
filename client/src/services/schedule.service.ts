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
    try {
      const snap = await getDocs(query(collection(db, COLLECTION_NAME), where('projectId', '==', projectId)));
      const schedules = snap.docs.map(d => ({ id: d.id, ...d.data() } as DefenseSchedule));
      
      // Fallback for older records using groupId
      const snapGroup = await getDocs(query(collection(db, COLLECTION_NAME), where('groupId', '==', projectId)));
      snapGroup.docs.forEach(d => {
        if (!schedules.find(s => s.id === d.id)) {
          schedules.push({ id: d.id, ...d.data() } as DefenseSchedule);
        }
      });
      return schedules;
    } catch (fsErr) {
      console.error('[scheduleService] getSchedulesByProject error:', fsErr);
      return [];
    }
  },

  /**
   * Fetch defense schedules for a student dashboard.
   */
  async getSchedulesForStudent(
    studentId: string, 
    groupId?: string | null,
    studentName?: string | null,
    projectTitle?: string | null
  ): Promise<DefenseSchedule[]> {
    try {
      const schedulesRef = collection(db, COLLECTION_NAME);
      const queries = [];
      
      if (studentId) {
        queries.push(getDocs(query(schedulesRef, where('studentId', '==', studentId))));
      }
      if (groupId) {
        queries.push(getDocs(query(schedulesRef, where('projectId', '==', groupId))));
        queries.push(getDocs(query(schedulesRef, where('groupId', '==', groupId))));
      }
      if (studentName) {
        queries.push(getDocs(query(schedulesRef, where('studentName', '==', studentName))));
      }
      if (projectTitle) {
        queries.push(getDocs(query(schedulesRef, where('projectTitle', '==', projectTitle))));
      }

      const snapshots = await Promise.all(queries);
      const uniqueSchedules = new Map<string, DefenseSchedule>();
      
      snapshots.forEach(snap => {
        snap.docs.forEach(docSnap => {
          uniqueSchedules.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as DefenseSchedule);
        });
      });

      return Array.from(uniqueSchedules.values());
    } catch (fsErr) {
      console.error('[scheduleService] getSchedulesForStudent error:', fsErr);
      return [];
    }
  },

  /**
   * Fetch defense schedules for an adviser dashboard.
   */
  async getSchedulesForAdviser(adviserId: string, groupIds: string[] = []): Promise<DefenseSchedule[]> {
    try {
      const schedulesRef = collection(db, COLLECTION_NAME);
      const queries = [];
      
      if (adviserId) {
        queries.push(getDocs(query(schedulesRef, where('adviserId', '==', adviserId))));
      }
      
      // Firestore 'in' query supports max 10 items. Chunk groupIds if any.
      if (groupIds && groupIds.length > 0) {
        const uniqueGroupIds = Array.from(new Set(groupIds));
        for (let i = 0; i < uniqueGroupIds.length; i += 10) {
          const chunk = uniqueGroupIds.slice(i, i + 10);
          queries.push(getDocs(query(schedulesRef, where('projectId', 'in', chunk))));
          queries.push(getDocs(query(schedulesRef, where('groupId', 'in', chunk))));
        }
      }

      const snapshots = await Promise.all(queries);
      const uniqueSchedules = new Map<string, DefenseSchedule>();
      
      snapshots.forEach(snap => {
        snap.docs.forEach(docSnap => {
          uniqueSchedules.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as DefenseSchedule);
        });
      });

      return Array.from(uniqueSchedules.values());
    } catch (fsErr) {
      console.error('[scheduleService] getSchedulesForAdviser error:', fsErr);
      return [];
    }
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

