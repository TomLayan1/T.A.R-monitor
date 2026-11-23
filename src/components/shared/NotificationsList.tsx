import { AlertTriangle, Bell, BellRing, CheckCheck, CheckCircle2, ClipboardCheck, Clock, Hand, XCircle, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  browserPermission,
  requestBrowserPermission,
} from '../../services/browserNotification.service';
import { useNotifications } from '../../hooks/useNotifications';
import type { AppNotification, NotificationCategory } from '../../types/notification';
import { formatDateTime } from '../../utils/date';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Select } from '../ui/Input';

const icons: Record<NotificationCategory, LucideIcon> = {
  'Positive T.A.R': AlertTriangle,
  'Pending Submission': Clock,
  'Overdue Reports': AlertTriangle,
  'Amendment Request': ClipboardCheck,
  'Amendment Approved': CheckCircle2,
  'Amendment Rejected': XCircle,
  'Amendment Completed': CheckCheck,
  Nudge: Hand,
  Reminder: BellRing,
  System: Bell,
};

const tones: Record<NotificationCategory, 'green' | 'amber' | 'rose' | 'slate'> = {
  'Positive T.A.R': 'rose',
  'Pending Submission': 'amber',
  'Overdue Reports': 'rose',
  'Amendment Request': 'amber',
  'Amendment Approved': 'green',
  'Amendment Rejected': 'rose',
  'Amendment Completed': 'green',
  Nudge: 'amber',
  Reminder: 'amber',
  System: 'slate',
};

/** Asks for browser notification permission; the in-app list is always the fallback. */
export function BrowserNotificationPrompt() {
  const [permission, setPermission] = useState(browserPermission());
  if (permission === 'granted' || permission === 'unsupported') return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        {permission === 'denied'
          ? 'Browser notifications are blocked. You will still see alerts here and as in-app pop-ups while the app is open.'
          : 'Turn on browser notifications to be alerted while this app is open in the background. Alerts always appear here too.'}
      </p>
      {permission === 'default' && (
        <Button size="sm" onClick={async () => setPermission(await requestBrowserPermission())}>
          Enable browser notifications
        </Button>
      )}
    </div>
  );
}

export function NotificationsList() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [category, setCategory] = useState<'all' | NotificationCategory>('all');

  const categories = useMemo(() => Array.from(new Set(notifications.map((n) => n.category))), [notifications]);
  const visible = notifications.filter((n) => (tab === 'all' || !n.read) && (category === 'all' || n.category === category));

  const open = (n: AppNotification) => {
    markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-4">
      <BrowserNotificationPrompt />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t === 'all' ? 'All (history)' : `Unread (${unreadCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-3">
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value as 'all' | NotificationCategory)}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Button variant="secondary" onClick={markAllRead} disabled={unreadCount === 0} icon={<CheckCheck className="h-4 w-4" />}>
            Mark all as read
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="New alerts and reminders will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {visible.map((n) => {
              const Icon = icons[n.category];
              return (
                <li key={n.id} className={`flex items-start gap-3 p-4 ${n.read ? 'bg-white' : 'bg-brand-light/40'}`}>
                  <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm text-slate-900 ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
                      <Badge tone={tones[n.category]}>{n.category}</Badge>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-brand" aria-label="Unread" />}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{n.description}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(n.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    {n.link && (
                      <Button size="sm" onClick={() => open(n)}>
                        Open
                      </Button>
                    )}
                    {!n.read && (
                      <Button size="sm" variant="secondary" onClick={() => markRead(n.id)}>
                        Mark as read
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
