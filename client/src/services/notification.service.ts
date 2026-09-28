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
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { AppNotification, CreateNotificationInput } from '../types/notification.types';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  /**
   * Create a new notification for a user.
   */
  async createNotification(input: CreateNotificationInput): Promise<AppNotification> {
    const docRef = doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();
    const newNotification: AppNotification = {
      id: docRef.id,
      ...input,
      read: false,
      createdAt: now,
    };
    await setDoc(docRef, newNotification);
    return newNotification;
  },

  /**
   * Fetch all notifications for a specific user ordered by creation time.
   */
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    const querySnap = await getDocs(q);
    const results = querySnap.docs.map((docSnap) => docSnap.data() as AppNotification);
    return results.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  /**
   * Real-time subscription to a user's notifications.
   */
  subscribeUserNotifications(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (querySnap) => {
      const results = querySnap.docs.map((docSnap) => docSnap.data() as AppNotification);
      const sorted = results.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      callback(sorted);
    }, (error) => {
      console.error('Error subscribing to notifications:', error);
    });
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { read: true });
  },

  /**
   * Mark all notifications as read for a given user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = await this.getUserNotifications(userId);
    const unread = userNotifications.filter((n) => !n.read);

    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((n) => {
      const docRef = doc(db, COLLECTION_NAME, n.id);
      batch.update(docRef, { read: true });
    });
    await batch.commit();
  },

  /**
   * Delete a notification.
   */
  async deleteNotification(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  /**
   * Notify all system administrators about a new student registration event.
   */
  async notifyAdminsNewStudentRegistration(studentData: {
    uid: string;
    fullName: string;
    studentIdOrEmployeeId: string;
    email: string;
    program?: string;
    programCode?: string;
    programSpecialization?: string;
    majorCode?: string;
    sectionName?: string;
  }): Promise<void> {
    try {
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const querySnap = await getDocs(q);
      const adminUsers = querySnap.docs.map((docSnap) => docSnap.data());

      const now = new Date().toISOString();
      const programDisplay = studentData.programCode || studentData.program || 'BSIT';
      const majorDisplay = studentData.majorCode || studentData.programSpecialization || 'None';
      const sectionDisplay = studentData.sectionName || 'None';

      const notificationPromises = adminUsers.map((admin) => {
        const docRef = doc(collection(db, COLLECTION_NAME));
        const notification: AppNotification = {
          id: docRef.id,
          userId: admin.uid,
          title: 'New Student Registration',
          message: `${studentData.fullName} has registered a new Student account. Student ID: ${studentData.studentIdOrEmployeeId} | Email: ${studentData.email} | Program: ${programDisplay} | Major: ${majorDisplay} | Section: ${sectionDisplay} | Status: Pending Approval`,
          type: 'system',
          read: false,
          relatedId: studentData.uid,
          relatedStudentId: studentData.uid,
          link: '/admin/users?tab=pending',
          createdAt: now,
        };
        return setDoc(docRef, notification);
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Failed to notify admins of new student registration:', error);
    }
  },
};

export default notificationService;
