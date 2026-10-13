export type NotificationType = 'system' | 'proposal' | 'manuscript' | 'schedule' | 'evaluation' | 'task' | 'info' | 'success' | 'warning' | 'group_invitation';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  linkUrl?: string;
  link?: string;
  relatedStudentId?: string;
  relatedId?: string;
  invitationId?: string;
  groupId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CreateNotificationInput {
  id?: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string;
  link?: string;
  relatedStudentId?: string;
  relatedId?: string;
  invitationId?: string;
  groupId?: string;
  metadata?: Record<string, any>;
}
