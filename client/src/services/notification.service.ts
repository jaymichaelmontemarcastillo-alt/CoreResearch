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
};

export default notificationService;
