import stationsJson from '../data/stations.json';
import usersJson from '../data/users.json';
import reportsJson from '../data/weekly-reports.json';
import type { Station } from '../types/station';
import type { StoredUser } from '../types/user';
import { fullName } from '../types/user';
import type { WeeklyLog } from '../types/weekly-log';
import { latestLogByStation } from '../utils/calculations';
import { maybeAlertPositiveTar } from './notification.service';
import { KEYS, batch, readJSON, writeJSON } from './storage';

const SEED_VERSION = '2026-11-v4';

/** Copies the JSON demo data into the shared store ONCE. Imported JSON is never mutated. */
export function ensureSeeded(): void {
  try {
    if (window.localStorage.getItem(KEYS.seeded) === SEED_VERSION) return;
  } catch {
    return;
  }
  batch(() => {
    const seedIfMissing = <T extends object>(key: string, data: T[]) => {
      if (readJSON<T[]>(key) === null) writeJSON(key, data.map((d) => ({ ...d })), false);
    };
    seedIfMissing(KEYS.users, usersJson as StoredUser[]);
    seedIfMissing(KEYS.stations, stationsJson as Station[]);
    seedIfMissing(KEYS.reports, reportsJson as WeeklyLog[]);
    seedIfMissing(KEYS.onboarding, []);
    seedIfMissing(KEYS.amendments, []);
    seedIfMissing(KEYS.amendmentHistory, []);
    seedIfMissing(KEYS.notifications, []);
    seedIfMissing(KEYS.nudges, []);
    seedIfMissing(KEYS.audit, []);
    seedIfMissing(KEYS.submissionStatus, []);

    // ---- Migration for data created by earlier versions. Never replaces existing records or values.
    // Users: drop the legacy `office` field, map legacy roles (registered BMs were stored as Management),
    // make sure `regions` exists, and add any demo users that are missing (BMs, Risk).
    const legacyUsers = readJSON<Array<Record<string, unknown>>>(KEYS.users);
    if (legacyUsers) {
      const roles = ['RMA', 'BM', 'Head of Retail', 'Risk', 'Management'];
      const fixed = legacyUsers.map((u) => {
        const { office, ...rest } = u as Record<string, unknown> & { office?: string };
        const role = office === 'BM' ? 'BM' : roles.includes(String(rest.role)) ? String(rest.role) : 'Management';
        return { ...rest, role, regions: Array.isArray(rest.regions) ? rest.regions : [] };
      }) as unknown as StoredUser[];
      const ids = new Set(fixed.map((u) => u.id));
      const emails = new Set(fixed.map((u) => u.email.toLowerCase()));
      const extra = (usersJson as StoredUser[]).filter((u) => !ids.has(u.id) && !emails.has(u.email.toLowerCase()));
      writeJSON(KEYS.users, [...fixed, ...extra], false);
    }

    // Stations: add the new fields and any seed stations that are missing (never replacing existing ones).
    const stored = readJSON<Station[]>(KEYS.stations);
    if (stored) {
      const seedById = new Map((stationsJson as Station[]).map((x) => [x.id, x]));
      const migrated = (stored as Array<Partial<Station> & { id: string }>).map((x) => {
        if ('region' in x && 'onboardingStatus' in x) return x;
        const seedStation = seedById.get(x.id);
        return {
          ...x,
          address: x.address ?? seedStation?.address ?? null,
          region: x.region ?? seedStation?.region ?? null,
          bmId: x.bmId ?? seedStation?.bmId ?? null,
          onboardedAt: x.onboardedAt ?? null,
          onboardingStatus: x.onboardingStatus ?? 'Active',
        };
      });
      const have = new Set(migrated.map((x) => x.id));
      const missing = (stationsJson as Station[]).filter((x) => !have.has(x.id));
      writeJSON(KEYS.stations, [...migrated, ...missing], false);
    }

    // Notifications: the old "High T.A.R" category is now "Positive T.A.R".
    const oldNotifications = readJSON<Array<Record<string, unknown>>>(KEYS.notifications);
    if (oldNotifications) {
      writeJSON(KEYS.notifications, oldNotifications.map((n) => (n.category === 'High T.A.R' ? { ...n, category: 'Positive T.A.R' } : n)), false);
    }

    // Starter alerts: the latest seeded report per station that has a positive T.A.R (history, deduplicated per report).
    const stations = stationsJson as Station[];
    const users = usersJson as StoredUser[];
    const latest = latestLogByStation(reportsJson as WeeklyLog[]);
    for (const station of stations) {
      const report = latest.get(station.id);
      const rma = users.find((u) => u.id === station.rmaId);
      if (report) maybeAlertPositiveTar(report, station, rma ? fullName(rma) : String(station.rmaId), report.submittedAt);
    }
    writeJSON(KEYS.seeded, SEED_VERSION, false);
  });
}

/** Developer helper: wipes every shared collection and reseeds. */
export function resetDemoData(): void {
  try {
    Object.values(KEYS).forEach((k) => {
      window.localStorage.removeItem(k);
    });
    window.sessionStorage.removeItem(KEYS.session);
  } catch {
    /* ignore */
  }
  ensureSeeded();
}
