import { useCallback, useMemo } from 'react';
import { markAllNotificationsRead, markNotificationRead } from '../services/notification.service';
import { useAuth } from './useAuth';
import { useSharedData } from './useSharedData';

export function useNotifications() {
  const { user } = useAuth();
  const { notifications: all } = useSharedData();

  const notifications = useMemo(
    () => (user ? all.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : []),
    [all, user],
  );
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markRead = useCallback((id: string) => user && markNotificationRead(user.id, id), [user]);
  const markAllRead = useCallback(() => user && markAllNotificationsRead(user.id), [user]);

  return { notifications, unreadCount, markRead, markAllRead };
}
