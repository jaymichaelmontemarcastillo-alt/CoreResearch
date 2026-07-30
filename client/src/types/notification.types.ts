export type NotificationType = 'system' | 'proposal' | 'manuscript' | 'schedule' | 'evaluation';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
}
