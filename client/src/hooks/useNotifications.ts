import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notification.service';
import { AppNotification, CreateNotificationInput } from '../types/notification.types';

export const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getUserNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
