import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { UserProfile } from '../types/user.types';
import { ResearchGroup } from '../types/researchGroup.types';
import { DefenseSchedule } from '../types/schedule.types';
import { groupService } from './group.service';
import progressService from './progress.service';

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
        if (data.projectId) {
          groupIds.add(data.projectId); // Assuming projectId points to the research group ID
        }
      });

      if (groupIds.size === 0) return [];

      // Fetch the actual groups
      const groups: ResearchGroup[] = [];
      // Firestore 'in' query supports up to 10 items.
      const groupIdArray = Array.from(groupIds);
      
      // Batch fetch groups
      for (let i = 0; i < groupIdArray.length; i += 10) {
        const chunk = groupIdArray.slice(i, i + 10);
        const groupQuery = query(collection(db, 'research_groups'), where('id', 'in', chunk));
        const groupSnapshot = await getDocs(groupQuery);
        groupSnapshot.forEach(docSnap => {
          groups.push({ id: docSnap.id, ...docSnap.data() } as ResearchGroup);
        });
      }

      return groups;
    } catch (error) {
      console.error('Error fetching panelist groups:', error);
      return [];
    }
  },

  /**
   * Get upcoming defense schedules for a faculty member
   */
  async getUpcomingDefenses(facultyId: string): Promise<DefenseSchedule[]> {
    try {
      const schedulesRef = collection(db, 'defense_schedules');
      // Query for schedules where this faculty is a panelist
      const q = query(schedulesRef, where('panelistIds', 'array-contains', facultyId));
      const snapshot = await getDocs(q);
      
      const schedules: DefenseSchedule[] = [];
      snapshot.forEach(docSnap => {
        schedules.push({ id: docSnap.id, ...docSnap.data() } as DefenseSchedule);
      });

      // Filter for upcoming dates and sort
      const now = new Date().toISOString();
      return schedules
        .filter(s => s.date >= now.split('T')[0] && s.status !== 'completed' && s.status !== 'cancelled')
        .sort((a, b) => a.date.localeCompare(b.date));
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
          const progress = await progressService.getGroupProgress(group.id);
          progressMap[group.id] = progress.overallProgress || 0;
        } catch (err) {
          progressMap[group.id] = 0;
        }
      })
    );
    
    return progressMap;
  }
};
