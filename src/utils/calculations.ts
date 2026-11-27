import { DEFAULT_SECURITY_BALANCE, type FinancialMonitorFigures } from '../types/monthly-log';
import type { Station } from '../types/station';
import type { WeeklyLog } from '../types/weekly-log';

/* =========================================================================================================
 * TAR MONITOR: the ONLY place the weekly formulas live. Forms, tables, dashboards, exports, notifications and
 * amendments all call these functions, so the RMA and Stakeholder portals always show the same values.
 * ========================================================================================================= */

/**
 * BUSINESS RULE (preserved exactly as specified; negatives are kept):
 * Available Credit = Trade Balance - Credit Limit
 * null when S4HANA has not supplied the credit limit yet.
 */
export const calculateAvailableCredit = (tradeBalance: number, creditLimit: number | null): number | null =>
  creditLimit === null ? null : tradeBalance - creditLimit;

/** Total Stock = Available Stock + CIT */
export const calculateTotalStock = (availableStock: number, cit: number): number => availableStock + cit;

/** TAR = Available Stock - Trade Balance */
export const calculateTar = (availableStock: number, tradeBalance: number): number => availableStock - tradeBalance;

/** Exposure = TAR - Available Stock + CIT (implemented exactly as specified, not algebraically simplified). */
export const calculateExposure = (tar: number, availableStock: number, cit: number): number => tar - availableStock + cit;

export interface WeeklyFigures {
  creditLimit: number | null;
  tradeBalance: number;
  availableStock: number;
  cit: number;
  availableCredit: number | null;
  totalStock: number;
  tar: number;
  exposure: number;
}

/** All weekly TAR figures from the S4HANA values and the RMA inputs. */
export function calculateWeeklyFigures(input: { creditLimit: number | null; tradeBalance: number; availableStock: number; cit: number }): WeeklyFigures {
  const tar = calculateTar(input.availableStock, input.tradeBalance);
  return {
    creditLimit: input.creditLimit,
    tradeBalance: input.tradeBalance,
    availableStock: input.availableStock,
    cit: input.cit,
    availableCredit: calculateAvailableCredit(input.tradeBalance, input.creditLimit),
    totalStock: calculateTotalStock(input.availableStock, input.cit),
    tar,
    exposure: calculateExposure(tar, input.availableStock, input.cit),
  };
}

/** Any positive TAR (even 1 naira) is a debt position and triggers notifications. There is no amount threshold. */
export const isPositiveTar = (tar: number): boolean => tar > 0;

/* =========================================================================================================
 * FINANCIAL MONITOR (Account Monitoring, monthly)
 * ========================================================================================================= */

/** Opening/Closing All = Stock + C.I.T */
export const calculateAll = (stock: number, cit: number): number => stock + cit;
/** Networth = C.I.T - Stock */
export const calculateNetworth = (all: number, balance: number): number => all - balance;
/** Closing Balance = Opening Balance + Turnover - Payment - Non-stock margin */
export const calculateClosingBalance = (openingBalance: number, turnover: number, payment: number, nonStockMargin: number): number =>
  openingBalance + turnover - payment - nonStockMargin;
/** Change in Balance = Closing Balance - Opening Balance */
export const calculateChangeInBalance = (closingBalance: number, openingBalance: number): number => closingBalance - openingBalance;
/** Change in Stock = Closing All - Opening All */
export const calculateChangeInStock = (closingAll: number, openingAll: number): number => closingAll - openingAll;
/** Net Effect = Change in Stock - Change in Balance */
export const calculateNetEffect = (changeInStock: number, changeInBalance: number): number => changeInStock - changeInBalance;

export interface FinancialMonitorInput {
  openingStock: number;
  openingBalanceCit: number;
  closingStock: number;
  closingBalanceCit: number;
  openingBalance?: number | null;
  turnover?: number | null;
  payment?: number | null;
  nonStockMargin?: number | null;
  securityBalance?: number | null;
}

const num = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function calculateFinancialMonitor(log: FinancialMonitorInput): FinancialMonitorFigures {
  const openingBalance = num(log.openingBalance);
  const turnover = num(log.turnover);
  const payment = num(log.payment);
  const nonStockMargin = num(log.nonStockMargin);
  const openingAll = calculateAll(log.openingStock, log.openingBalanceCit);
  const closingAll = calculateAll(log.closingStock, log.closingBalanceCit);
  // Closing Balance is always recalculated from its parts so the screen, export and carry-forward agree.
  const closingBalance = calculateClosingBalance(openingBalance, turnover, payment, nonStockMargin);
  const changeInBalance = calculateChangeInBalance(closingBalance, openingBalance);
  const changeInStock = calculateChangeInStock(closingAll, openingAll);
  return {
    openingStock: log.openingStock,
    openingCit: log.openingBalanceCit,
    openingAll,
    openingBalance,
    openingNetworth: calculateNetworth(openingAll, openingBalance),
    turnover,
    payment,
    nonStockMargin,
    closingBalance,
    closingNetworth: calculateNetworth(closingAll, closingBalance),
    closingStock: log.closingStock,
    closingCit: log.closingBalanceCit,
    closingAll,
    securityBalance: typeof log.securityBalance === 'number' && Number.isFinite(log.securityBalance) ? log.securityBalance : DEFAULT_SECURITY_BALANCE,
    changeInBalance,
    changeInStock,
    netEffect: calculateNetEffect(changeInStock, changeInBalance),
  };
}

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
  totalTradeBalance: number;
  totalAvailableStock: number;
  totalCit: number;
  totalStock: number;
  totalTar: number;
  totalExposure: number;
  positiveTarStations: number;
}

/** Totals over each station's latest weekly log (stations without a log add nothing except their credit limit). */
export function summarise(snapshots: StationSnapshot[]): DashboardSummary {
  return snapshots.reduce<DashboardSummary>(
    (acc, { station, log }) => ({
      stationCount: acc.stationCount + 1,
      totalCredit: acc.totalCredit + (station.creditLimit ?? 0),
      totalAvailableCredit: acc.totalAvailableCredit + (log?.availableCredit ?? 0),
      totalTradeBalance: acc.totalTradeBalance + (log?.tradeBalance ?? 0),
      totalAvailableStock: acc.totalAvailableStock + (log?.availableStock ?? 0),
      totalCit: acc.totalCit + (log?.cit ?? 0),
      totalStock: acc.totalStock + (log?.totalStock ?? 0),
      totalTar: acc.totalTar + (log?.tar ?? 0),
      totalExposure: acc.totalExposure + (log?.exposure ?? 0),
      positiveTarStations: acc.positiveTarStations + (log && isPositiveTar(log.tar) ? 1 : 0),
    }),
    { stationCount: 0, totalCredit: 0, totalAvailableCredit: 0, totalTradeBalance: 0, totalAvailableStock: 0, totalCit: 0, totalStock: 0, totalTar: 0, totalExposure: 0, positiveTarStations: 0 },
  );
}

/** Highest TAR first, based on each station's latest weekly log. */
export function topTarStations(snapshots: StationSnapshot[], count = 4): LoggedSnapshot[] {
  return snapshots
    .filter(hasLog)
    .sort((a, b) => b.log.tar - a.log.tar)
    .slice(0, count);
}

export interface TarChartDatum {
  stationCode: string;
  stationName: string;
  tar: number;
}

export function buildTarChartData(snapshots: StationSnapshot[]): TarChartDatum[] {
  return snapshots
    .filter(hasLog)
    .map(({ station, log }) => ({
      stationCode: station.stationCode ?? station.stationName,
      stationName: station.stationName,
      tar: log.tar,
    }))
    .sort((a, b) => b.tar - a.tar);
}

export interface Utilisation {
  totalLimit: number;
  totalTradeBalance: number;
  withinLimit: number;
  aboveLimit: number;
  unused: number;
  percent: number;
}

/** Share of total credit limits consumed by the latest S4HANA Trade Balance (which replaces the old Total Exposure). */
export function buildUtilisation(snapshots: StationSnapshot[]): Utilisation {
  let totalLimit = 0;
  let totalTradeBalance = 0;
  let withinLimit = 0;
  let aboveLimit = 0;
  for (const { station, log } of snapshots) {
    if (station.creditLimit === null) continue; // no credit limit yet: cannot measure utilisation
    totalLimit += station.creditLimit;
    if (!log) continue;
    const balance = Math.max(log.tradeBalance, 0);
    totalTradeBalance += balance;
    withinLimit += Math.min(balance, station.creditLimit);
    aboveLimit += Math.max(balance - station.creditLimit, 0);
  }
  return {
    totalLimit,
    totalTradeBalance,
    withinLimit,
    aboveLimit,
    unused: totalLimit - withinLimit,
    percent: totalLimit > 0 ? (totalTradeBalance / totalLimit) * 100 : 0,
  };
}
