/**
 * Browser-level notifications for the local MVP. They use the Notification API (and the service
 * worker in /public/sw.js when registered). Without a backend/push provider they can only appear
 * while this app is open in a browser tab - they are NOT true remote push messages.
 */
export const browserNotificationsSupported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export const browserPermission = (): NotificationPermission | 'unsupported' =>
  browserNotificationsSupported() ? Notification.permission : 'unsupported';

export async function requestBrowserPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!browserNotificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function showBrowserNotification(title: string, body: string, url: string | null, tag: string): Promise<void> {
  if (!browserNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) {
      await reg.showNotification(title, { body, tag, data: { url: url ?? '/' } });
    } else {
      new Notification(title, { body, tag });
    }
  } catch {
    /* ignore - the in-app notification is always the fallback */
  }
}
