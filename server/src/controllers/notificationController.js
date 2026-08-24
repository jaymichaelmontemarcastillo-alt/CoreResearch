import { db, isDevMockMode, mockFirestoreDb } from '../config/firebaseAdmin.js';

const seedMockNotificationsIfEmpty = () => {
  if (!mockFirestoreDb.has('notifications')) {
    const initialNotifs = [
      {
        id: 'notif-1',
        userId: 'dev-student-01',
        title: 'Title Proposal Approved',
        message: 'Your title proposal "Smart IoT Moisture Sensing System" was approved by Dr. Vance.',
        read: false,
        createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
      },
      {
        id: 'notif-2',
        userId: 'dev-student-01',
        title: 'Defense Scheduled',
        message: 'Proposal defense presentation scheduled for Aug 14, 2026 at 10:00 AM.',
        read: false,
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ];

    const map = new Map();
    initialNotifs.forEach(n => map.set(n.id, n));
    mockFirestoreDb.set('notifications', map);
  }
};

export const getNotifications = async (req, res) => {
  try {
    const user = req.user;
    let list = [];

    if (isDevMockMode) {
      seedMockNotificationsIfEmpty();
      const map = mockFirestoreDb.get('notifications');
      list = Array.from(map.values()).filter(n => n.userId === user.uid || n.userId === 'all');
    } else {
      const snapshot = await db.collection('notifications').where('userId', 'in', [user.uid, 'all']).get();
      list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    console.error('[NotificationController] getNotifications error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (isDevMockMode) {
      seedMockNotificationsIfEmpty();
      const map = mockFirestoreDb.get('notifications');
      const n = map.get(id);
      if (n) {
        n.read = true;
        map.set(id, n);
      }
    } else {
      await db.collection('notifications').doc(id).update({ read: true });
    }

    return res.status(200).json({ success: true, message: 'Notification marked read.' });
  } catch (error) {
    console.error('[NotificationController] markNotificationRead error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
