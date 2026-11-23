import type { AppNotification, NewNotification } from '../types/notification';
import type { Role, SessionUser, StoredUser } from '../types/user';
import { fullName } from '../types/user';
import { stationCodeLabel, stationRef, type Station } from '../types/station';
import type { WeeklyLog } from '../types/weekly-log';
import { formatNaira } from '../utils/currency';
import { isPositiveTar } from '../utils/calculations';
import { formatWeek } from '../utils/date';
import { getNow } from './clock.service';
import { KEYS, newId, readCollection, saveCollection } from './storage';

/**
 * In-app notification delivery. One record per recipient, stored in the shared collection;
 * other tabs pick it up through the store's BroadcastChannel / storage events.
 * NOTE: this is LocalStorage only - there is no remote push without a backend (see README).
 */
export function pushNotifications(items: NewNotification[]): AppNotification[] {
  if (items.length === 0) return [];
  const existing = readCollection<AppNotification>(KEYS.notifications);
  const keys = new Set(existing.map((n) => n.dedupeKey).filter((k): k is string => Boolean(k)));
  const created: AppNotification[] = [];
  for (const item of items) {
    if (item.dedupeKey && keys.has(item.dedupeKey)) continue; // never create the same alert twice
    if (item.dedupeKey) keys.add(item.dedupeKey);
    created.push({
      ...item,
      id: newId('ntf'),
      createdAt: item.createdAt ?? getNow().toISOString(),
      read: false,
      readAt: null,
    });
  }
  if (created.length > 0) saveCollection(KEYS.notifications, [...existing, ...created]);
  return created;
}

export const notificationsFor = (userId: string): AppNotification[] =>
  readCollection<AppNotification>(KEYS.notifications)
    .filter((n) => n.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export function markNotificationRead(userId: string, notificationId: string): void {
  const all = readCollection<AppNotification>(KEYS.notifications);
  let changed = false;
  const next = all.map((n) => {
    if (n.id === notificationId && n.userId === userId && !n.read) {
      changed = true;
      return { ...n, read: true, readAt: getNow().toISOString() };
    }
    return n;
  });
  if (changed) saveCollection(KEYS.notifications, next);
}

export function markAllNotificationsRead(userId: string): void {
  const all = readCollection<AppNotification>(KEYS.notifications);
  const at = getNow().toISOString();
  saveCollection(
    KEYS.notifications,
    all.map((n) => (n.userId === userId && !n.read ? { ...n, read: true, readAt: at } : n)),
  );
}

export const usersWithRoles = (roles: Role[]): StoredUser[] =>
  readCollection<StoredUser>(KEYS.users).filter((u) => roles.includes(u.role));

/** Management department users (reminders, overdue notices). */
export const managementUsers = (): StoredUser[] => usersWithRoles(['Management']);
export const riskUsers = (): StoredUser[] => usersWithRoles(['Risk']);

/** The BM associated with a station: the station's BM, else its RMA's BM. */
export function associatedBm(station: Pick<Station, 'bmId' | 'rmaId'>): StoredUser | undefined {
  const users = readCollection<StoredUser>(KEYS.users);
  const bmId = station.bmId ?? users.find((u) => u.id === station.rmaId)?.bmId ?? null;
  return bmId ? users.find((u) => u.id === bmId && u.role === 'BM') : undefined;
}

/** Role-specific routes for deep links. */
export const routes = {
  rmaWeeklyLogs: (q?: string) => `/rma/weekly-logs${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  rmaStations: '/rma/stations',
  rmaNotifications: '/rma/notifications',
  mgmtStations: (q?: string) => `/management/stations${q ? `?q=${encodeURIComponent(q)}` : ''}`,
  mgmtApprovals: '/management/approvals',
  mgmtOutstanding: (week: string) => `/management/outstanding?week=${week}`,
};

/**
 * Positive T.A.R/Debt alert. ANY positive T.A.R (even 1 naira) notifies EVERY registered user, whatever
 * their role. Negative and zero never notify. There is no amount threshold. Each submitted report
 * (including every amended version) is evaluated independently and deduplicated per report id + user.
 */
export function maybeAlertPositiveTar(report: WeeklyLog, station: Station, rmaName: string, createdAt?: string): void {
  if (!isPositiveTar(report.tarDebt)) return;
  const users = readCollection<StoredUser>(KEYS.users);
  pushNotifications(
    users.map((u) => ({
      userId: u.id,
      category: 'Positive T.A.R' as const,
      title: `Positive T.A.R: ${stationRef(station)}`,
      description: `${station.stationName} (${stationCodeLabel(station)}) reported a positive T.A.R/Debt of ${formatNaira(report.tarDebt)} for the ${formatWeek(report.reportingWeek).toLowerCase()} (report v${report.version}, exposure ${formatNaira(report.totalExposure)}, stock ${formatNaira(report.availableStock)}). RMA: ${rmaName}.`,
      link:
        u.role === 'RMA'
          ? station.rmaId === u.id
            ? routes.rmaWeeklyLogs(stationRef(station))
            : null
          : routes.mgmtStations(stationRef(station)),
      stationId: station.id,
      reportId: report.id,
      requestId: null,
      dedupeKey: `tar:${report.id}:${u.id}`,
      createdAt,
    })),
  );
}

export const displayName = (u: SessionUser | StoredUser | undefined): string => (u ? fullName(u) : 'Unknown');
