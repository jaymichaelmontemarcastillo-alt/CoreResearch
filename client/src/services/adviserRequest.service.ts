import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import api from './api';
import notificationService from './notification.service';

export type AdviserRequestStatus = 'pending' | 'accepted' | 'declined';

export interface AdviserRequest {
  id: string;
  studentId: string;
  studentName: string;
  groupId: string;
  groupName: string;
  courseId?: string;
  courseName?: string;
  sectionId?: string;
  sectionName?: string;
  researchTitle: string;
  researchDescription: string;
  adviserId: string;
  adviserName: string;
  compatibilityScore: number;
  status: AdviserRequestStatus;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLLECTION = 'adviser_requests';

/**
 * Removes undefined fields before saving to Firestore.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

class AdviserRequestService {
  /**
   * Submit a new adviser request after student selection.
   */
  async createRequest(input: Partial<AdviserRequest>): Promise<AdviserRequest> {
    const response = await api.post('/adviser-matching/requests', stripUndefined(input));
    const request = response.data?.data as AdviserRequest;

    // Do not block UI response on notification dispatch
    if (response.data?.created) {
      notificationService.createNotification({
        userId: request.adviserId,
        title: 'New Adviser Request',
        message: `${request.studentName} has selected you as their research adviser for: ${request.researchTitle}`,
        type: 'info'
      }).catch((error) => {
        console.warn('[adviserRequestService] Request saved, but adviser notification failed:', error);
      });
    }

    return request;
  }

  /**
   * Get an adviser request by ID
   */
  async getRequestById(id: string): Promise<AdviserRequest | null> {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) return null;
    return snap.data() as AdviserRequest;
  }

  private inflightRequests = new Map<string, Promise<AdviserRequest[]>>();

  /**
   * Fetch all requests for a specific student/group with automatic leader linkage.
   * Uses in-flight deduplication to prevent duplicate concurrent API calls.
   */
  async getRequestsForStudentOrGroup(studentId: string, groupId?: string, leaderId?: string): Promise<AdviserRequest[]> {
    const cacheKey = `${studentId}:${groupId || 'none'}`;
    const existing = this.inflightRequests.get(cacheKey);
    if (existing) return existing;

    const requestPromise = (async () => {
      try {
        const response = await api.get('/adviser-matching/requests', {
          params: { groupId: groupId || undefined },
        });
        return (response.data?.data || []) as AdviserRequest[];
      } catch (err: any) {
        console.warn('[adviserRequestService] API getRequests error, falling back to direct Firestore:', err.message || err);
        try {
          const queries = [];
          if (studentId) {
            queries.push(getDocs(query(collection(db, COLLECTION), where('studentId', '==', studentId))));
          }
          if (groupId) {
            queries.push(getDocs(query(collection(db, COLLECTION), where('groupId', '==', groupId))));
          }
          const snaps = await Promise.all(queries);
          const map = new Map<string, AdviserRequest>();
          snaps.forEach(snap => {
            if (snap && snap.docs) {
              snap.docs.forEach(d => {
                map.set(d.id, { id: d.id, ...d.data() } as AdviserRequest);
              });
            }
          });
          return Array.from(map.values());
        } catch (fErr: any) {
          console.error('[adviserRequestService] Direct Firestore fallback failed:', fErr.message || fErr);
          // Do not silently return [] on backend and storage failures, as that falsely indicates
          // zero active requests and causes duplicate submissions.
          const errorMsg = err.response?.data?.message || fErr.message || 'Unable to load adviser requests.';
          throw new Error(errorMsg);
        }
      } finally {
        setTimeout(() => {
          this.inflightRequests.delete(cacheKey);
        }, 3000);
      }
    })();

    this.inflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  /**
   * Get all pending requests for a specific adviser.
   */
  async getPendingRequestsForAdviser(adviserId: string): Promise<AdviserRequest[]> {
    const q = query(
      collection(db, COLLECTION),
      where('adviserId', '==', adviserId),
      where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    // Sort client-side if missing composite index, otherwise we could add orderBy('createdAt', 'desc')
    const requests = snap.docs.map(d => d.data() as AdviserRequest);
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all requests for a specific adviser (pending, accepted, declined).
   */
  async getAllRequestsForAdviser(adviserId: string): Promise<AdviserRequest[]> {
    const q = query(
      collection(db, COLLECTION),
      where('adviserId', '==', adviserId)
    );
    const snap = await getDocs(q);
    const requests = snap.docs.map(d => d.data() as AdviserRequest);
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Adviser Accepts the request
   */
  async acceptRequest(requestId: string): Promise<void> {
    const ref = doc(db, COLLECTION, requestId);
    const snap = await getDoc(ref);
    const requestData = snap.data() as AdviserRequest;

    await updateDoc(ref, {
      status: 'accepted',
      updatedAt: new Date().toISOString()
    });

    if (requestData) {
      // Update the actual research group to assign the adviser
      if (requestData.groupId && requestData.adviserId) {
        try {
          const groupService = (await import('./group.service')).default;
          await groupService.updateGroupAdviser(
            requestData.groupId,
            requestData.adviserId,
            requestData.adviserName,
            requestId
          );
        } catch (error) {
          console.error('Error updating group adviser:', error);
        }
      }

      await notificationService.createNotification({
        userId: requestData.studentId, // or group notification if applicable
        title: 'Adviser Request Accepted',
        message: `${requestData.adviserName} has accepted your adviser request.`,
        type: 'success'
      });
    }
  }

  /**
   * Adviser Declines the request
   */
  async declineRequest(requestId: string): Promise<void> {
    const ref = doc(db, COLLECTION, requestId);
    const snap = await getDoc(ref);
    const requestData = snap.data() as AdviserRequest;

    await updateDoc(ref, {
      status: 'declined',
      updatedAt: new Date().toISOString()
    });

    if (requestData) {
      await notificationService.createNotification({
        userId: requestData.studentId,
        title: 'Adviser Request Declined',
        message: `${requestData.adviserName} has declined your adviser request. You may select another adviser.`,
        type: 'warning'
      });
    }
  }

  /**
   * Delete a request (e.g., student restarting submission)
   */
  async deleteRequest(requestId: string): Promise<void> {
    const ref = doc(db, COLLECTION, requestId);
    await deleteDoc(ref);
  }

  /**
   * Archive or Unarchive a request
   */
  async toggleArchiveRequest(requestId: string, isArchived: boolean): Promise<void> {
    const ref = doc(db, COLLECTION, requestId);
    await updateDoc(ref, {
      isArchived,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Real-time subscription to requests for a specific student/group.
   */
  subscribeToStudentRequests(
    studentId: string,
    callback: (requests: AdviserRequest[]) => void,
    groupId?: string,
    leaderId?: string
  ): () => void {
    // Query by owner so Firestore rules can prove every returned document is
    // readable; group-wide lookups go through the authenticated server route.
    const q = query(collection(db, COLLECTION), where('studentId', '==', studentId));
    return onSnapshot(q, async (snap) => {
      let requests = snap.docs.map(d => d.data() as AdviserRequest);
      callback(requests);
    });
  }

  subscribeToRequest(requestId: string, callback: (request: AdviserRequest | null) => void): () => void {
    return onSnapshot(doc(db, COLLECTION, requestId), (snap) => {
      callback(snap.exists() ? (snap.data() as AdviserRequest) : null);
    });
  }

  /**
   * Real-time subscription to pending requests for an adviser.
   */
  subscribeToPendingAdviserRequests(adviserId: string, callback: (requests: AdviserRequest[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION),
      where('adviserId', '==', adviserId),
      where('status', '==', 'pending')
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => d.data() as AdviserRequest);
      const sorted = requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(sorted);
    });
  }

  /**
   * Real-time subscription to all requests for an adviser (pending, accepted, declined).
   */
  subscribeToAllAdviserRequests(adviserId: string, callback: (requests: AdviserRequest[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION),
      where('adviserId', '==', adviserId)
    );
    return onSnapshot(q, (snap) => {
      const requests = snap.docs.map(d => d.data() as AdviserRequest);
      const sorted = requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(sorted);
    });
  }
}

export const adviserRequestService = new AdviserRequestService();
export default adviserRequestService;
