import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
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
    const ref = doc(collection(db, COLLECTION));
    const now = new Date().toISOString();

    const request: AdviserRequest = {
      id: ref.id,
      studentId: input.studentId || '',
      studentName: input.studentName || '',
      groupId: input.groupId || '',
      groupName: input.groupName || '',
      courseId: input.courseId,
      courseName: input.courseName,
      sectionId: input.sectionId,
      sectionName: input.sectionName,
      researchTitle: input.researchTitle || '',
      researchDescription: input.researchDescription || '',
      adviserId: input.adviserId || '',
      adviserName: input.adviserName || '',
      compatibilityScore: input.compatibilityScore || 0,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(ref, stripUndefined(request) as AdviserRequest);

    // Notify the selected adviser
    await notificationService.createNotification({
      userId: request.adviserId,
      title: 'New Adviser Request',
      message: `${request.studentName} has selected you as their research adviser for: ${request.researchTitle}`,
      type: 'info'
    });

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

  /**
   * Fetch all requests for a specific student/group with automatic leader linkage.
   */
  async getRequestsForStudentOrGroup(studentId: string, groupId?: string, leaderId?: string): Promise<AdviserRequest[]> {
    if (groupId) {
      const q = query(collection(db, COLLECTION), where('groupId', '==', groupId));
      const snap = await getDocs(q);
      let requests = snap.docs.map(d => d.data() as AdviserRequest);

      if (requests.length === 0) {
        let resolvedLeaderId = leaderId;
        try {
          const gSnap = await getDoc(doc(db, 'research_groups', groupId));
          if (gSnap.exists()) {
            const gData = gSnap.data();
            if (!resolvedLeaderId) {
              resolvedLeaderId = gData.memberIds?.[0] || gData.members?.[0]?.uid;
            }
          }
        } catch (e) {}

        if (resolvedLeaderId) {
          const leaderQ = query(collection(db, COLLECTION), where('studentId', '==', resolvedLeaderId));
          const leaderSnap = await getDocs(leaderQ);
          if (!leaderSnap.empty) {
            requests = leaderSnap.docs.map(d => d.data() as AdviserRequest);
            // Backfill groupId on leader's request doc
            for (const d of leaderSnap.docs) {
              updateDoc(d.ref, {
                groupId: groupId,
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
            }
          }
        }
      }

      return requests;
    }

    const q = query(collection(db, COLLECTION), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AdviserRequest);
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
            requestData.adviserName
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
   * Real-time subscription to requests for a specific student/group.
   */
  subscribeToStudentRequests(
    studentId: string,
    callback: (requests: AdviserRequest[]) => void,
    groupId?: string,
    leaderId?: string
  ): () => void {
    const conditions = [];
    if (groupId) {
      conditions.push(where('groupId', '==', groupId));
    } else {
      conditions.push(where('studentId', '==', studentId));
    }

    const q = query(collection(db, COLLECTION), ...conditions);
    return onSnapshot(q, async (snap) => {
      let requests = snap.docs.map(d => d.data() as AdviserRequest);
      if (requests.length === 0 && groupId) {
        let resolvedLeaderId = leaderId;
        if (!resolvedLeaderId) {
          try {
            const gSnap = await getDoc(doc(db, 'research_groups', groupId));
            if (gSnap.exists()) {
              resolvedLeaderId = gSnap.data().memberIds?.[0];
            }
          } catch (e) {}
        }
        if (resolvedLeaderId && resolvedLeaderId !== studentId) {
          try {
            const leaderQ = query(collection(db, COLLECTION), where('studentId', '==', resolvedLeaderId));
            const leaderSnap = await getDocs(leaderQ);
            if (!leaderSnap.empty) {
              requests = leaderSnap.docs.map(d => d.data() as AdviserRequest);
              for (const d of leaderSnap.docs) {
                updateDoc(d.ref, { groupId, updatedAt: new Date().toISOString() }).catch(() => {});
              }
            }
          } catch (e) {}
        }
      }
      callback(requests);
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
