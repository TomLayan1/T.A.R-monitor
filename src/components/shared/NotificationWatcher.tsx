import { useEffect, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { showBrowserNotification } from '../../services/browserNotification.service';
import { useToast } from '../ui/Toast';

/**
 * Watches the signed-in user's notifications. Anything that arrives while the app is open (including
 * from another tab, via the shared store sync) raises an in-app pop-up and, when permission was
 * granted, a browser notification. Existing notifications at sign-in are not replayed.
 */
export function NotificationWatcher() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const { notify } = useToast();
  const seen = useRef<Set<string> | null>(null);
  const owner = useRef<string | null>(null);

  useEffect(() => {
    if (!user) {
      seen.current = null;
      owner.current = null;
      return;
    }
    if (seen.current === null || owner.current !== user.id) {
      seen.current = new Set(notifications.map((n) => n.id));
      owner.current = user.id;
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (n.read) continue;
      notify('info', `${n.title}: ${n.description}`);
      void showBrowserNotification(n.title, n.description, n.link, n.id);
    }
  }, [notifications, user, notify]);

  return null;
}
