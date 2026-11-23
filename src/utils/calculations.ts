import type { Station } from '../types/station';
import type { WeeklyLog } from '../types/weekly-log';

/**
 * BUSINESS RULE (preserved exactly as specified, negatives are kept):
 * Available Credit = Total Exposure - Credit Limit
 */
export const calculateAvailableCredit = (totalExposure: number, creditLimit: number | null): number | null =>
  creditLimit === null ? null : totalExposure - creditLimit; // null: credit limit not yet supplied by S4HANA

/**
 * BUSINESS RULE: T.A.R Exposure/Debt = Available Stock - Total Exposure
 */
export const calculateTarDebt = (availableStock: number, totalExposure: number): number =>
  availableStock - totalExposure;

/** Any positive T.A.R/Debt (even 1 naira) is a debt position and triggers notifications. There is no amount threshold. */
export const isPositiveTar = (tarDebt: number): boolean => tarDebt > 0;

/** Later reporting week wins, then higher version, then later submission time. */
export const isLaterLog = (a: WeeklyLog, b: WeeklyLog): boolean => {
  if (a.reportingWeek !== b.reportingWeek) return a.reportingWeek > b.reportingWeek;
  if (a.version !== b.version) return a.version > b.version;
  return a.submittedAt > b.submittedAt;
};

/** Collapses all versions to the current (highest) version per station + reporting week. */
export function currentVersions(reports: WeeklyLog[]): WeeklyLog[] {
  const map = new Map<string, WeeklyLog>();
  for (const r of reports) {
    const key = `${r.stationId}|${r.reportingWeek}`;
    const existing = map.get(key);
    if (!existing || r.version > existing.version) map.set(key, r);
  }
  return Array.from(map.values());
}

export function latestLogByStation(logs: WeeklyLog[]): Map<string, WeeklyLog> {
  const latest = new Map<string, WeeklyLog>();
  for (const log of logs) {
    const current = latest.get(log.stationId);
    if (!current || isLaterLog(log, current)) latest.set(log.stationId, log);
  }
  return latest;
}

export const sortLogsNewestFirst = (logs: WeeklyLog[]): WeeklyLog[] =>
  [...logs].sort((a, b) => (isLaterLog(a, b) ? -1 : isLaterLog(b, a) ? 1 : 0));

export interface StationSnapshot {
  station: Station;
  log: WeeklyLog | null;
}

export type LoggedSnapshot = { station: Station; log: WeeklyLog };

export const hasLog = (s: StationSnapshot): s is LoggedSnapshot => s.log !== null;

export function buildSnapshots(stations: Station[], logs: WeeklyLog[]): StationSnapshot[] {
  const latest = latestLogByStation(logs);
  return stations.map((station) => ({ station, log: latest.get(station.id) ?? null }));
}

export interface DashboardSummary {
  stationCount: number;
  totalCredit: number;
  totalAvailableCredit: number;
  totalAvailableStock: number;
  totalExposure: number;
  positiveTarStations: number;
}

export function summarise(snapshots: StationSnapshot[]): DashboardSummary {
  return snapshots.reduce<DashboardSummary>(
    (acc, { station, log }) => ({
      stationCount: acc.stationCount + 1,
      totalCredit: acc.totalCredit + (station.creditLimit ?? 0),
      totalAvailableCredit: acc.totalAvailableCredit + (log?.availableCredit ?? 0),
      totalAvailableStock: acc.totalAvailableStock + (log?.availableStock ?? 0),
      totalExposure: acc.totalExposure + (log?.totalExposure ?? 0),
      positiveTarStations: acc.positiveTarStations + (log && isPositiveTar(log.tarDebt) ? 1 : 0),
    }),
    { stationCount: 0, totalCredit: 0, totalAvailableCredit: 0, totalAvailableStock: 0, totalExposure: 0, positiveTarStations: 0 },
  );
}

/** Highest T.A.R/Debt first, based on each station's latest weekly log. */
export function topTarStations(snapshots: StationSnapshot[], count = 4): LoggedSnapshot[] {
  return snapshots
    .filter(hasLog)
    .sort((a, b) => b.log.tarDebt - a.log.tarDebt)
    .slice(0, count);
}

export interface TarChartDatum {
  stationCode: string;
  stationName: string;
  tarDebt: number;
}

export function buildTarChartData(snapshots: StationSnapshot[]): TarChartDatum[] {
  return snapshots
    .filter(hasLog)
    .map(({ station, log }) => ({
      stationCode: station.stationCode ?? station.stationName,
      stationName: station.stationName,
      tarDebt: log.tarDebt,
    }))
    .sort((a, b) => b.tarDebt - a.tarDebt);
}

export interface Utilisation {
  totalLimit: number;
  totalExposure: number;
  withinLimit: number;
  aboveLimit: number;
  unused: number;
  percent: number;
}

/** Share of total credit limits consumed by the latest reported exposure. */
export function buildUtilisation(snapshots: StationSnapshot[]): Utilisation {
  let totalLimit = 0;
  let totalExposure = 0;
  let withinLimit = 0;
  let aboveLimit = 0;
  for (const { station, log } of snapshots) {
    if (station.creditLimit === null) continue; // no credit limit yet: cannot measure utilisation
    totalLimit += station.creditLimit;
    if (!log) continue;
    const exposure = Math.max(log.totalExposure, 0);
    totalExposure += exposure;
    withinLimit += Math.min(exposure, station.creditLimit);
    aboveLimit += Math.max(exposure - station.creditLimit, 0);
  }
  return {
    totalLimit,
    totalExposure,
    withinLimit,
    aboveLimit,
    unused: totalLimit - withinLimit,
    percent: totalLimit > 0 ? (totalExposure / totalLimit) * 100 : 0,
  };
}
