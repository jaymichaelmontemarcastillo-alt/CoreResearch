import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { UserProfile } from '../types/user.types';
import { ResearchGroup } from '../types/group.types';
import { DefenseSchedule } from '../types/schedule.types';
import { groupService } from './group.service';
import progressService from './progress.service';
import { scheduleService } from './schedule.service';

const FACULTY_COLLECTION = 'faculty_assignments'; // Abstract collection, we might query groups directly

export const facultyService = {
  /**
   * Get all research groups assigned to an adviser
   */
  async getAdviserGroups(facultyId: string): Promise<ResearchGroup[]> {
    try {
      // Query research groups where the adviser matches the facultyId
      const groupsRef = collection(db, 'research_groups');
      const q = query(groupsRef, where('adviserId', '==', facultyId));
      const snapshot = await getDocs(q);
      
      const groups: ResearchGroup[] = [];
      snapshot.forEach(docSnap => {
        groups.push({ id: docSnap.id, ...docSnap.data() } as ResearchGroup);
      });
      return groups;
    } catch (error) {
      console.error('Error fetching adviser groups:', error);
      return [];
    }
  },

  /**
   * Get all research groups that have an assigned adviser (for Admin & Coordinator review)
   */
  async getAllAdviserGroups(): Promise<ResearchGroup[]> {
    try {
      const groupsRef = collection(db, 'research_groups');
      const snapshot = await getDocs(groupsRef);
      const groups: ResearchGroup[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.adviserId && data.adviserId !== 'undefined' && data.adviserName && data.adviserName !== 'undefined') {
          groups.push({ id: docSnap.id, ...data } as ResearchGroup);
        }
      });
      return groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
      console.error('Error fetching all adviser groups:', error);
      return [];
    }
  },

  /**
   * Get all research groups where the faculty is assigned as a panelist
   */
  async getPanelistGroups(facultyId: string): Promise<ResearchGroup[]> {
    try {
      // First, get all schedules where the faculty is a panelist
      const schedulesRef = collection(db, 'defense_schedules');
      const q = query(schedulesRef, where('panelistIds', 'array-contains', facultyId));
      const snapshot = await getDocs(q);
      
      const groupIds = new Set<string>();
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const gId = data.groupId || data.projectId;
        if (gId) {
          groupIds.add(gId);
        }
      });

      if (groupIds.size === 0) return [];

      // Fetch the actual groups directly by doc reference
      const groups: ResearchGroup[] = [];
      await Promise.all(
        Array.from(groupIds).map(async (gId) => {
          try {
            const gSnap = await getDoc(doc(db, 'research_groups', gId));
            if (gSnap.exists()) {
              groups.push({ id: gSnap.id, ...gSnap.data() } as ResearchGroup);
            }
          } catch (e) {}
        })
      );

      return groups;
    } catch (error) {
      console.error('Error fetching panelist groups:', error);
      return [];
    }
  },

  /**
   * Get upcoming defense schedules for a faculty member (as panelist or adviser)
   */
  async getUpcomingDefenses(facultyId: string): Promise<DefenseSchedule[]> {
    try {
      let schedules: DefenseSchedule[] = [];
      try {
        schedules = await scheduleService.getAllSchedules();
      } catch (e) {
        schedules = [];
      }

      if (schedules.length === 0) {
        const schedulesRef = collection(db, 'defense_schedules');
        const q = query(schedulesRef, where('panelistIds', 'array-contains', facultyId));
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
          schedules.push({ id: docSnap.id, ...docSnap.data() } as DefenseSchedule);
        });
      }

      const now = new Date().toISOString().split('T')[0];
      return schedules
        .filter(s => {
          const isPanelist = Array.isArray(s.panelistIds) && s.panelistIds.includes(facultyId);
          const isAdviser = s.adviserId === facultyId;
          return (isPanelist || isAdviser) && (s.date ? s.date >= now : true) && s.status !== 'completed' && s.status !== 'cancelled';
        })
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    } catch (error) {
      console.error('Error fetching upcoming defenses:', error);
      return [];
    }
  },

  /**
   * Get a high-level summary of progress for a list of groups
   */
  async getGroupsProgressSummary(groups: ResearchGroup[]): Promise<Record<string, number>> {
    const progressMap: Record<string, number> = {};
    
    await Promise.all(
      groups.map(async (group) => {
        try {
          const progress = typeof (progressService as any).getGroupProgress === 'function'
            ? await (progressService as any).getGroupProgress(group.id)
            : null;
          progressMap[group.id] = progress?.overallProgress || 0;
        } catch (err) {
          progressMap[group.id] = 0;
        }
      })
    );
    
    return progressMap;
  }
};
