import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notification.service';
import { AppNotification, CreateNotificationInput } from '../types/notification.types';

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = notificationService.subscribeUserNotifications(userId, (data) => {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const fetchNotifications = useCallback(async () => {
    // Kept for backward compatibility if manual refetch is still called,
    // though the real-time listener handles state automatically.
  }, []);

  const sendNotification = async (input: CreateNotificationInput): Promise<AppNotification> => {
    try {
      const created = await notificationService.createNotification(input);
      if (input.userId === userId) {
        await fetchNotifications();
      }
      return created;
    } catch (err: any) {
      setError(err.message || 'Failed to send notification');
      throw err;
    }
  };

  const markAsRead = async (id: string): Promise<void> => {
    try {
      await notificationService.markAsRead(id);
      await fetchNotifications();
    } catch (err: any) {
      setError(err.message || 'Failed to mark notification as read');
      throw err;
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    if (!userId) return;
    try {
      await notificationService.markAllAsRead(userId);
      await fetchNotifications();
    } catch (err: any) {
      setError(err.message || 'Failed to mark all as read');
      throw err;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    sendNotification,
    markAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
