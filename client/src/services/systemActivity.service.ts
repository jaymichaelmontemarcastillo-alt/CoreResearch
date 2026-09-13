// src/services/systemActivity.service.ts
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  addDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import api from './api';

export interface SystemActivity {
  id: string;
  title: string;
  description: string;
  actorName: string;
  actorRole?: string;
  category: 'proposal' | 'workspace' | 'task' | 'feedback' | 'adviser' | 'repository' | 'schedule';
  timestamp: string;
}

export const systemActivityService = {
  /**
   * Log a system-wide activity event
   */
  async logActivity(activity: Omit<SystemActivity, 'id' | 'timestamp'>): Promise<void> {
    try {
      const colRef = collection(db, 'system_activities');
      await addDoc(colRef, {
        ...activity,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[systemActivityService] Failed to log activity:', err);
    }
  },

  /**
   * Fetch recent system activities (aggregating across system collections + system_activities)
   */
  async getRecentActivities(maxItems: number = 8): Promise<SystemActivity[]> {
    const activities: SystemActivity[] = [];

    // 1. Check logged system_activities in Firestore
    try {
      const q = query(
        collection(db, 'system_activities'),
        orderBy('timestamp', 'desc'),
        limit(maxItems)
      );
      const snap = await getDocs(q);
      snap.docs.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...(doc.data() as Omit<SystemActivity, 'id'>),
        });
      });
    } catch (e) {
      // Index or collection not yet ready, continue to aggregation
    }

    // 2. Query actual system events from live collections to provide rich real system history
    try {
      // A. Research Tasks (Completions & assignments)
      const tasksSnap = await getDocs(query(collection(db, 'research_tasks'), limit(15)));
      tasksSnap.docs.forEach((d) => {
        const t = d.data();
        if (t.status === 'completed' || t.status === 'resolved') {
          activities.push({
            id: `task-${d.id}`,
            title: `Task Resolved: "${t.title}"`,
            description: t.studentName
              ? `${t.studentName} completed work verified by ${t.adviserName || 'Adviser'}`
              : `Research action item completed and resolved.`,
            actorName: t.adviserName || t.studentName || 'Research Member',
            actorRole: 'adviser',
            category: 'task',
            timestamp: t.completedAt || t.updatedAt || t.createdAt || new Date().toISOString(),
          });
        } else if (t.createdAt) {
          activities.push({
            id: `task-new-${d.id}`,
            title: `Task Assigned: "${t.title}"`,
            description: `Adviser assigned research task for ${t.studentName || 'researchers'}`,
            actorName: t.adviserName || 'Adviser',
            actorRole: 'adviser',
            category: 'task',
            timestamp: t.createdAt,
          });
        }
      });

      // B. Adviser Requests (Acceptances / Matches)
      const requestsSnap = await getDocs(query(collection(db, 'adviser_requests'), limit(10)));
      requestsSnap.docs.forEach((d) => {
        const r = d.data();
        if (r.status === 'accepted') {
          activities.push({
            id: `req-acc-${d.id}`,
            title: `Adviser Confirmed: ${r.adviserName}`,
            description: `${r.adviserName} accepted mentorship for "${r.researchTitle}"`,
            actorName: r.adviserName || 'Faculty Adviser',
            actorRole: 'adviser',
            category: 'adviser',
            timestamp: r.updatedAt || r.createdAt || new Date().toISOString(),
          });
        } else if (r.status === 'pending') {
          activities.push({
            id: `req-sub-${d.id}`,
            title: `Adviser Request Submitted`,
            description: `${r.studentName || 'Student Group'} requested mentorship from ${r.adviserName}`,
            actorName: r.studentName || 'Student Group',
            actorRole: 'student',
            category: 'adviser',
            timestamp: r.createdAt || new Date().toISOString(),
          });
        }
      });

      // C. Feedback & Action Items
      const feedbackSnap = await getDocs(query(collection(db, 'research_feedback'), limit(10)));
      feedbackSnap.docs.forEach((d) => {
        const f = d.data();
        if (f.status === 'resolved') {
          activities.push({
            id: `fb-${d.id}`,
            title: `Adviser Feedback Resolved`,
            description: `Manuscript feedback on ${f.sectionId ? f.sectionId.replace('_', ' ') : 'draft'} resolved`,
            actorName: f.authorName || 'Faculty Adviser',
            actorRole: 'adviser',
            category: 'feedback',
            timestamp: f.updatedAt || f.createdAt || new Date().toISOString(),
          });
        }
      });

      // D. Repository Publications
      try {
        const repoRes = await api.get('/repository');
        if (repoRes.data?.data) {
          repoRes.data.data.slice(0, 5).forEach((p: any) => {
            activities.push({
              id: `pub-${p.id}`,
              title: `Paper Published: "${p.title}"`,
              description: `Approved research paper published to Institutional Repository (${p.department})`,
              actorName: Array.isArray(p.authors) ? p.authors[0] : p.authors || 'Author',
              actorRole: 'author',
              category: 'repository',
              timestamp: p.publishedAt || new Date().toISOString(),
            });
          });
        }
      } catch (e) {
        // Fallback silently if API not reached
      }
    } catch (err) {
      console.warn('[systemActivityService] Error querying system collections:', err);
    }

    // Deduplicate by ID
    const uniqueMap = new Map<string, SystemActivity>();
    activities.forEach((item) => {
      uniqueMap.set(item.id, item);
    });

    // If still empty (e.g. fresh installation or unseeded), provide baseline system milestones
    if (uniqueMap.size === 0) {
      const baseline: SystemActivity[] = [
        {
          id: 'base-1',
          title: 'Institutional Repository Synchronized',
          description: 'Autonomous Drone Navigation & Student Retention Analytics indexed.',
          actorName: 'CoreResearch System',
          category: 'repository',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
        {
          id: 'base-2',
          title: 'Adviser Matching System Online',
          description: 'Faculty research profiles and domain keyword matrices initialized.',
          actorName: 'Academic Affairs',
          category: 'adviser',
          timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        },
        {
          id: 'base-3',
          title: 'Academic Term Defense Guidelines Released',
          description: 'Review rubrics and manuscript formatting templates updated.',
          actorName: 'Research Coordinator',
          category: 'workspace',
          timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
        },
      ];
      return baseline;
    }

    // Sort descending by timestamp
    const sorted = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return sorted.slice(0, maxItems);
  },

  /**
   * Subscribe to real-time system activities
   */
  subscribeRecentActivities(callback: (activities: SystemActivity[]) => void): () => void {
    // Initial fetch
    this.getRecentActivities().then(callback).catch(console.error);

    // Also listen to system_activities collection in real-time
    try {
      const q = query(
        collection(db, 'system_activities'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      return onSnapshot(
        q,
        () => {
          this.getRecentActivities().then(callback).catch(console.error);
        },
        () => {
          // Fallback: poll every 30s
          const interval = setInterval(() => {
            this.getRecentActivities().then(callback).catch(console.error);
          }, 30000);
          return () => clearInterval(interval);
        }
      );
    } catch (e) {
      const interval = setInterval(() => {
        this.getRecentActivities().then(callback).catch(console.error);
      }, 30000);
      return () => clearInterval(interval);
    }
  },
};

export default systemActivityService;
