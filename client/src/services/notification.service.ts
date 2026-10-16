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
import { auth, db } from '../firebase/firebase';
import { AppNotification, CreateNotificationInput } from '../types/notification.types';

const COLLECTION_NAME = 'notifications';

export const notificationService = {
  /**
   * Deduplicate an array of notifications and purge duplicate documents in the background.
   */
  deduplicateNotifications(notifications: AppNotification[]): AppNotification[] {
    const seenKeys = new Set<string>();
    const uniqueNotifications: AppNotification[] = [];
    const duplicateIdsToDelete: string[] = [];

    // Sort descending by createdAt
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const notif of sorted) {
      const primaryKey = notif.id;
      const chapterKey = notif.metadata?.chapterId || '';
      const semanticKey = `${notif.userId}::${notif.type}::${notif.relatedId || ''}::${chapterKey}::${(notif.title || '').trim().toLowerCase()}::${(notif.message || '').trim().toLowerCase()}`;

      if (seenKeys.has(primaryKey) || seenKeys.has(semanticKey)) {
        duplicateIdsToDelete.push(notif.id);
        continue;
      }

      seenKeys.add(primaryKey);
      seenKeys.add(semanticKey);
      uniqueNotifications.push(notif);
    }

    // Purge duplicate docs from Firestore in the background
    if (duplicateIdsToDelete.length > 0) {
      Promise.all(
        duplicateIdsToDelete.map((dupId) =>
          deleteDoc(doc(db, COLLECTION_NAME, dupId)).catch(() => {})
        )
      ).catch(() => {});
    }

    return uniqueNotifications;
  },

  /**
   * Create a new notification for a user (or update existing if deterministic ID is provided).
   */
  async createNotification(input: CreateNotificationInput): Promise<AppNotification> {
    const createdByUid = auth.currentUser?.uid;
    if (!createdByUid) {
      throw new Error('Authentication is required to create a notification.');
    }

    const docRef = input.id
      ? doc(db, COLLECTION_NAME, input.id)
      : doc(collection(db, COLLECTION_NAME));
    const now = new Date().toISOString();

    let readStatus = false;
    let createdAt = now;

    if (input.id) {
      try {
        const existingSnap = await getDoc(docRef);
        if (existingSnap.exists()) {
          const existingData = existingSnap.data() as AppNotification;
          readStatus = existingData.read ?? false;
          createdAt = existingData.createdAt || now;
        }
      } catch (e) {}
    }

    const newNotification: AppNotification = {
      id: docRef.id,
      ...input,
      createdByUid,
      read: readStatus,
      createdAt,
    };
    await setDoc(docRef, newNotification);
    return newNotification;
  },

  /**
   * Fetch all notifications for a specific user ordered by creation time (deduplicated).
   */
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    const querySnap = await getDocs(q);
    const results = querySnap.docs.map((docSnap) => docSnap.data() as AppNotification);
    return this.deduplicateNotifications(results);
  },

  /**
   * Real-time subscription to a user's notifications (deduplicated).
   */
  subscribeUserNotifications(userId: string, callback: (notifications: AppNotification[]) => void): () => void {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    return onSnapshot(q, (querySnap) => {
      const results = querySnap.docs.map((docSnap) => docSnap.data() as AppNotification);
      const deduplicated = this.deduplicateNotifications(results);
      callback(deduplicated);
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

};

export default notificationService;
