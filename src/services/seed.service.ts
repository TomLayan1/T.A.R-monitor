import stationsJson from '../data/stations.json';
import usersJson from '../data/users.json';
import reportsJson from '../data/weekly-reports.json';
import monthlyLogsJson from '../data/monthly-logs.json';
import type { AmendmentHistoryEntry, AmendmentRequest } from '../types/amendment';
import type { MonthlyLog } from '../types/monthly-log';
import type { Station } from '../types/station';
import type { StoredUser } from '../types/user';
import { fullName } from '../types/user';
import type { WeeklyLog } from '../types/weekly-log';
import { calculateWeeklyFigures, latestLogByStation } from '../utils/calculations';
import { s4hana } from './s4hana.service';
import { getNow } from './clock.service';
import { maybeAlertPositiveTar } from './notification.service';
import { KEYS, batch, readJSON, writeJSON } from './storage';

const SEED_VERSION = '2026-11-v7-monthly-turnover-payment';

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
    seedIfMissing(KEYS.monthlyLogs, monthlyLogsJson as MonthlyLog[]);
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

    migrateWeeklyStructure();

    // Monthly logs: Turnover, Payment, Non-stock margin and the account balance were added. Untouched demo logs
    // (same id and closing values as the seed) get the new seed figures; logs an RMA entered keep their values and
    // read the new fields as 0 (see normalizeMonthlyLog).
    const storedMonthly = readJSON<MonthlyLog[]>(KEYS.monthlyLogs);
    if (storedMonthly) {
      const seedLogs = new Map((monthlyLogsJson as MonthlyLog[]).map((l) => [l.id, l]));
      writeJSON(
        KEYS.monthlyLogs,
        storedMonthly.map((l) => {
          const fresh = seedLogs.get(l.id);
          const untouched = fresh && fresh.stationId === l.stationId && fresh.reportingMonth === l.reportingMonth
            && fresh.closingStock === l.closingStock && fresh.closingBalanceCit === l.closingBalanceCit && l.turnover === undefined;
          return untouched ? { ...fresh } : l;
        }),
        false,
      );
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

type LegacyReport = Partial<WeeklyLog> & { id: string; stationId: string; reportingWeek: string; availableStock: number; totalExposure?: number; tarDebt?: number };

/**
 * TAR MONITOR MIGRATION. Weekly logs are converted, never deleted; the RMA's own figures are never replaced by a
 * generated one.
 *  - Old structure (RMA-entered "Total Exposure", no CIT): untouched seed records are replaced by the new seed
 *    version; anything else keeps its Available Stock, takes its Trade Balance from the old Total Exposure (the
 *    same RMA-entered figure under its new name), records CIT as ₦0 and keeps the old figures under `legacy`.
 *  - Logs written by the previous build (Trade Balance simulated from S4HANA): a converted log takes its Trade
 *    Balance from `legacy.totalExposure`; an untouched seed log is refreshed from the new seed. Logs an RMA
 *    submitted are kept as they are.
 * Amendment requests and history are re-derived from the reports in the same pass.
 */
function migrateWeeklyStructure(): void {
  const stored = readJSON<LegacyReport[]>(KEYS.reports);
  if (!stored) return;
  const seedById = new Map((reportsJson as WeeklyLog[]).map((r) => [r.id, r]));
  const untouchedSeed = (r: LegacyReport) => {
    const fresh = seedById.get(r.id);
    if (!fresh || fresh.availableStock !== r.availableStock || fresh.version !== r.version || fresh.submittedAt !== r.submittedAt) return null;
    // Old-structure records match on Available Stock; previous-build seed records must also keep the seed CIT.
    return typeof r.cit === 'number' && r.cit !== fresh.cit ? null : fresh;
  };
  const migratedAt = getNow().toISOString();
  const recalc = (r: WeeklyLog, tradeBalance: number): WeeklyLog => ({
    ...r,
    ...calculateWeeklyFigures({ creditLimit: r.creditLimit, tradeBalance, availableStock: r.availableStock, cit: r.cit }),
  });
  const reports: WeeklyLog[] = stored.map((r) => {
    const fresh = untouchedSeed(r);
    if (typeof r.tradeBalance === 'number') {
      const log = r as WeeklyLog;
      if (log.legacy) return log.tradeBalance === log.legacy.totalExposure ? log : recalc(log, log.legacy.totalExposure);
      return fresh ? { ...fresh } : log;
    }
    if (fresh) return { ...fresh };
    const station = readJSON<Station[]>(KEYS.stations)?.find((st) => st.id === r.stationId);
    const creditLimit = station ? s4hana.getCreditLimit(station) : null;
    const { totalExposure, tarDebt, ...rest } = r;
    return {
      ...(rest as WeeklyLog),
      ...calculateWeeklyFigures({ creditLimit, tradeBalance: totalExposure ?? 0, availableStock: r.availableStock, cit: 0 }),
      legacy: { totalExposure: totalExposure ?? 0, tarDebt: tarDebt ?? 0, migratedAt },
    };
  });
  writeJSON(KEYS.reports, reports, false);
  const byId = new Map(reports.map((r) => [r.id, r]));

  const amendments = readJSON<Array<AmendmentRequest & { originalTotalExposure?: number }>>(KEYS.amendments) ?? [];
  writeJSON(
    KEYS.amendments,
    amendments.map(({ originalTotalExposure: _old, ...a }) => {
      const report = byId.get(a.reportId);
      return { ...a, originalTradeBalance: report?.tradeBalance ?? a.originalTradeBalance ?? 0, originalCit: report?.cit ?? a.originalCit ?? 0 };
    }),
    false,
  );

  type LegacyHistory = Partial<AmendmentHistoryEntry> & Pick<AmendmentHistoryEntry, 'id' | 'originalReportId' | 'updatedReportId'> & { tradeBalance?: number };
  const history = readJSON<LegacyHistory[]>(KEYS.amendmentHistory) ?? [];
  const legacyKeys = ['tradeBalance', 'originalTotalExposure', 'originalAvailableCredit', 'originalTarDebt', 'updatedTotalExposure', 'updatedAvailableCredit', 'updatedTarDebt'];
  writeJSON(
    KEYS.amendmentHistory,
    history.map((h) => {
      const o = byId.get(h.originalReportId);
      const u = byId.get(h.updatedReportId);
      const clean = Object.fromEntries(Object.entries(h).filter(([k]) => !legacyKeys.includes(k)));
      const oldTb = h.originalTradeBalance ?? h.tradeBalance ?? 0;
      return {
        ...clean,
        originalTradeBalance: o?.tradeBalance ?? oldTb,
        originalAvailableStock: o?.availableStock ?? h.originalAvailableStock ?? 0,
        originalCit: o?.cit ?? h.originalCit ?? 0,
        originalTotalStock: o?.totalStock ?? h.originalTotalStock ?? 0,
        originalTar: o?.tar ?? h.originalTar ?? 0,
        originalExposure: o?.exposure ?? h.originalExposure ?? 0,
        updatedTradeBalance: u?.tradeBalance ?? h.updatedTradeBalance ?? oldTb,
        updatedAvailableStock: u?.availableStock ?? h.updatedAvailableStock ?? 0,
        updatedCit: u?.cit ?? h.updatedCit ?? 0,
        updatedTotalStock: u?.totalStock ?? h.updatedTotalStock ?? 0,
        updatedTar: u?.tar ?? h.updatedTar ?? 0,
        updatedExposure: u?.exposure ?? h.updatedExposure ?? 0,
      };
    }),
    false,
  );
}
