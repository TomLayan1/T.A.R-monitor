import { DEFAULT_SECURITY_BALANCE, type FinancialMonitorFigures, type MonthlyLog, type NewMonthlyLogInput } from '../types/monthly-log';
import { stationRef, type Station } from '../types/station';
import { calculateClosingBalance, calculateFinancialMonitor } from '../utils/calculations';
import { formatNaira } from '../utils/currency';
import { currentMonth, formatMonth, isMonthKey } from '../utils/date';
import { getActor, requireRole } from './access';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';

/* =========================================================================================================
 * ACCOUNT MONITORING (monthly stock and cash balances) with the carry-forward rule:
 *   Opening Stock          = previous month's Closing Stock          (same station)
 *   Opening C.I.T          = previous month's Closing C.I.T          (same station)
 *   Opening Balance        = previous month's Closing Balance        (same station)
 * carried forward SEPARATELY (never added together), read-only, and persisted with the log.
 * "Previous month" is the station's most recent earlier monthly log, so a skipped month carries forward from the
 * last valid record instead of inventing a balance. A station's first monthly log opens at ₦0 / ₦0.
 * ========================================================================================================= */

const finite = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * Logs saved before Turnover / Payment / Non-stock margin existed have none of those fields. They are read as 0,
 * and Closing Balance is always recalculated from its parts, so old and new logs behave the same everywhere.
 */
export function normalizeMonthlyLog(raw: MonthlyLog): MonthlyLog {
  const r = raw as Partial<MonthlyLog> & MonthlyLog;
  const openingBalance = finite(r.openingBalance);
  const turnover = finite(r.turnover);
  const payment = finite(r.payment);
  const nonStockMargin = finite(r.nonStockMargin);
  return {
    ...r,
    openingBalance,
    turnover,
    payment,
    nonStockMargin,
    closingBalance: calculateClosingBalance(openingBalance, turnover, payment, nonStockMargin),
    securityBalance: typeof r.securityBalance === 'number' && Number.isFinite(r.securityBalance) ? r.securityBalance : DEFAULT_SECURITY_BALANCE,
  };
}

export const listMonthlyLogs = (): MonthlyLog[] => readCollection<MonthlyLog>(KEYS.monthlyLogs).map(normalizeMonthlyLog);

const logsForStation = (logs: MonthlyLog[], stationId: string) =>
  logs.filter((l) => l.stationId === stationId).sort((a, b) => a.reportingMonth.localeCompare(b.reportingMonth));

/** The station's most recent monthly log (by reporting month). */
const last = <T>(items: T[]): T | null => (items.length ? items[items.length - 1] : null);

export const latestMonthlyLog = (logs: MonthlyLog[], stationId: string): MonthlyLog | null => last(logsForStation(logs, stationId));

export interface OpeningPosition {
  openingStock: number;
  openingBalanceCit: number;
  openingBalance: number;
  source: MonthlyLog['openingSource'];
  fromLog: MonthlyLog | null;
  /** true when one or more months between the source log and this month have no log. */
  skippedMonths: boolean;
}

/** Opening values for a station's reporting month, from the most recent EARLIER log of the SAME station. */
export function openingPositionFor(logs: MonthlyLog[], stationId: string, reportingMonth: string): OpeningPosition {
  const previous = last(logsForStation(logs, stationId).filter((l) => l.reportingMonth < reportingMonth));
  if (!previous) return { openingStock: 0, openingBalanceCit: 0, openingBalance: 0, source: 'first-log', fromLog: null, skippedMonths: false };
  const [py, pm] = previous.reportingMonth.split('-').map(Number);
  const [ty, tm] = reportingMonth.split('-').map(Number);
  return {
    openingStock: previous.closingStock,
    openingBalanceCit: previous.closingBalanceCit,
    openingBalance: normalizeMonthlyLog(previous).closingBalance,
    source: 'carried-forward',
    fromLog: previous,
    skippedMonths: ty * 12 + tm - (py * 12 + pm) > 1,
  };
}

/**
 * Reporting-month rule: a month can be logged once per station, not in the future, and only AFTER the station's
 * latest existing log. Back-filling an earlier month would silently change the opening values that later logs
 * were based on, so it is refused.
 */
export function monthValidationError(logs: MonthlyLog[], stationId: string, reportingMonth: string, now: Date): string | null {
  if (!isMonthKey(reportingMonth)) return 'Select a valid reporting month.';
  if (reportingMonth > currentMonth(now)) return 'You cannot log a future month.';
  if (logs.some((l) => l.stationId === stationId && l.reportingMonth === reportingMonth)) {
    return `A monthly log already exists for ${formatMonth(reportingMonth)}. Each station has one monthly log per month.`;
  }
  const latest = latestMonthlyLog(logs, stationId);
  if (latest && reportingMonth < latest.reportingMonth) {
    return `This station already has a log for ${formatMonth(latest.reportingMonth)}. Earlier months cannot be added because the opening values of later months were carried forward from it.`;
  }
  return null;
}

export function validateMonthlyAmounts(amounts: { closingStock: number; closingBalanceCit: number; turnover: number; payment: number; nonStockMargin: number }): void {
  const checks = [
    ['Closing Stock', amounts.closingStock],
    ['Closing C.I.T', amounts.closingBalanceCit],
    ['Turnover', amounts.turnover],
    ['Payment', amounts.payment],
    ['Non-stock margin', amounts.nonStockMargin],
  ] as const;
  for (const [label, v] of checks) {
    if (!Number.isFinite(v)) throw new Error(`${label} must be a valid number.`);
    if (v < 0) throw new Error(`${label} cannot be negative.`);
  }
}

/** RMA only, own stations only. Opening values are computed here, never accepted from the UI. */
export function submitMonthlyLog(actorId: string, input: NewMonthlyLogInput): MonthlyLog {
  const actor = getActor(actorId);
  requireRole(actor, ['RMA']);
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === input.stationId);
  if (!station) throw new Error('Station not found.');
  if (station.rmaId !== actor.id) throw new Error('This station is not assigned to you.');
  const nonStockMargin = input.nonStockMargin ?? 0;
  validateMonthlyAmounts({ ...input, nonStockMargin });
  const logs = listMonthlyLogs();
  const problem = monthValidationError(logs, station.id, input.reportingMonth, getNow());
  if (problem) throw new Error(problem);

  const opening = openingPositionFor(logs, station.id, input.reportingMonth);
  const log: MonthlyLog = {
    id: newId('mlog'),
    stationId: station.id,
    stationCode: station.stationCode,
    stationName: station.stationName,
    reportingMonth: input.reportingMonth,
    openingStock: opening.openingStock,
    openingBalanceCit: opening.openingBalanceCit,
    closingStock: input.closingStock,
    closingBalanceCit: input.closingBalanceCit,
    openingBalance: opening.openingBalance,
    turnover: input.turnover,
    payment: input.payment,
    nonStockMargin,
    closingBalance: calculateClosingBalance(opening.openingBalance, input.turnover, input.payment, nonStockMargin),
    securityBalance: DEFAULT_SECURITY_BALANCE,
    openingSource: opening.source,
    carriedFromLogId: opening.fromLog?.id ?? null,
    carriedFromMonth: opening.fromLog?.reportingMonth ?? null,
    rmaId: actor.id,
    bmId: station.bmId ?? actor.bmId,
    submittedAt: getNow().toISOString(),
    comments: input.comments?.trim() || null,
  };
  const figures = calculateFinancialMonitor(log);
  batch(() => {
    saveCollection(KEYS.monthlyLogs, [...logs, log]);
    recordAudit(
      actor.id,
      'MONTHLY_LOG_SUBMITTED',
      'monthly-log',
      log.id,
      `${stationRef(station)} ${formatMonth(log.reportingMonth)}: opening ${formatNaira(log.openingStock)} / ${formatNaira(log.openingBalanceCit)} (${opening.source}${log.carriedFromMonth ? ` from ${log.carriedFromMonth}` : ''}), closing ${formatNaira(log.closingStock)} / ${formatNaira(log.closingBalanceCit)}, turnover ${formatNaira(log.turnover)}, payment ${formatNaira(log.payment)}, NSM ${formatNaira(log.nonStockMargin)}, closing balance ${formatNaira(log.closingBalance)}, net effect ${formatNaira(figures.netEffect)}`,
    );
  });
  return log;
}

/* ---- Financial Monitor rows (derived from monthly logs only) ---- */

export interface FinancialMonitorRow {
  station: Station;
  log: MonthlyLog | null;
  figures: FinancialMonitorFigures | null;
}

/**
 * One row per station. month = 'latest' uses each station's most recent monthly log; a YYYY-MM month uses that
 * month's log. A station without a log has figures = null (shown as missing, never as zeros).
 */
export function buildFinancialMonitorRows(stations: Station[], logs: MonthlyLog[], month: string | 'latest'): FinancialMonitorRow[] {
  return stations.map((station) => {
    const log = month === 'latest' ? latestMonthlyLog(logs, station.id) : logs.find((l) => l.stationId === station.id && l.reportingMonth === month) ?? null;
    return { station, log, figures: log ? calculateFinancialMonitor(log) : null };
  });
}
