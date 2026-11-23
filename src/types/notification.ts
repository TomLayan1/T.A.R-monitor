export type NotificationCategory =
  | 'Positive T.A.R'
  | 'Pending Submission'
  | 'Overdue Reports'
  | 'Amendment Request'
  | 'Amendment Approved'
  | 'Amendment Rejected'
  | 'Amendment Completed'
  | 'Nudge'
  | 'Reminder'
  | 'System';

export interface AppNotification {
  id: string;
  /** Recipient user id. One record per recipient. */
  userId: string;
  category: NotificationCategory;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  readAt: string | null;
  /** In-app route to open for this recipient (already role-specific). */
  link: string | null;
  stationId: string | null;
  reportId: string | null;
  requestId: string | null;
  /** Used to stop duplicate notifications caused by refreshes or repeated evaluation. */
  dedupeKey: string | null;
}

export type NewNotification = Omit<AppNotification, 'id' | 'read' | 'readAt' | 'createdAt'> & { createdAt?: string };

export interface NudgeRecord {
  id: string;
  rmaId: string;
  senderId: string;
  reportingWeek: string;
  outstandingStations: number;
  sentAt: string;
}

export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

/** Scheduler bookkeeping so a reminder/final notice is only produced once. */
export interface SchedulerMarker {
  key: string;
  at: string;
}
