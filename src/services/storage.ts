/**
 * SHARED DATA STORE (LocalStorage repository).
 * Every portal reads and writes the same namespaced collections through these helpers, so a real
 * backend can replace this file later without touching components. Components never use
 * localStorage directly.
 */
export const KEYS = {
  users: 'rma_system_users',
  stations: 'rma_system_stations',
  onboarding: 'rma_system_station_onboarding',
  reports: 'rma_system_weekly_reports',
  monthlyLogs: 'rma_system_monthly_logs',
  amendments: 'rma_system_amendment_requests',
  amendmentHistory: 'rma_system_amendment_history',
  notifications: 'rma_system_notifications',
  nudges: 'rma_system_nudge_history',
  audit: 'rma_system_audit_logs',
  submissionStatus: 'rma_system_submission_status',
  session: 'rma_system_session',
  clock: 'rma_system_clock',
  seeded: 'rma_system_seed_version',
} as const;

const CHANNEL_NAME = 'rma_system_sync';
let channel: BroadcastChannel | null = null;
try {
  channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;
  // Node (unit tests) keeps a process alive while a channel is open; browsers have no unref.
  (channel as unknown as { unref?: () => void } | null)?.unref?.();
} catch {
  channel = null;
}

const listeners = new Set<() => void>();
let batchDepth = 0;
let dirty = false;

/** Tell this tab (directly) and other tabs (BroadcastChannel) that shared data changed. */
export function emitChange(): void {
  if (batchDepth > 0) {
    dirty = true;
    return;
  }
  listeners.forEach((l) => l());
  try {
    channel?.postMessage({ at: Date.now() });
  } catch {
    /* ignore */
  }
}

/** Groups several writes into a single change notification. */
export function batch<T>(fn: () => T): T {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0 && dirty) {
      dirty = false;
      emitChange();
    }
  }
}

/** Subscribe to changes from this tab, other tabs (BroadcastChannel) and the `storage` event. */
export function subscribeStore(callback: () => void): () => void {
  listeners.add(callback);
  const onMessage = () => callback();
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith('rma_system_')) callback();
  };
  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(callback);
    channel?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

export function readJSON<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON<T>(key: string, value: T, emit = true): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode / quota) */
  }
  if (emit) emitChange();
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
  emitChange();
}

/** Always read fresh from storage so concurrent tabs never act on stale copies. */
export const readCollection = <T>(key: string): T[] => readJSON<T[]>(key) ?? [];
export const saveCollection = <T>(key: string, items: T[]): void => writeJSON(key, items);

export function updateCollection<T>(key: string, fn: (items: T[]) => T[]): T[] {
  const next = fn(readCollection<T>(key));
  saveCollection(key, next);
  return next;
}

export const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ---- per-tab session (sessionStorage) so two roles can be signed in side by side in different tabs ---- */
export const readSessionUserId = (): string | null => {
  try {
    return window.sessionStorage.getItem(KEYS.session);
  } catch {
    return null;
  }
};
export const writeSessionUserId = (id: string | null): void => {
  try {
    if (id) window.sessionStorage.setItem(KEYS.session, id);
    else window.sessionStorage.removeItem(KEYS.session);
  } catch {
    /* ignore */
  }
  emitChange();
};

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
