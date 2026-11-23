import { stationRef, type Station } from '../types/station';
import type { NewWeeklyLogInput, WeeklyLog } from '../types/weekly-log';
import { fullName } from '../types/user';
import type { StoredUser } from '../types/user';
import { calculateAvailableCredit, calculateTarDebt } from '../utils/calculations';
import { currentWeekEnding, isSunday } from '../utils/date';
import { getActor, requireRole } from './access';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { maybeAlertPositiveTar } from './notification.service';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';

export const listReports = (): WeeklyLog[] => readCollection<WeeklyLog>(KEYS.reports);

export function validateAmounts(totalExposure: number, availableStock: number): void {
  for (const [label, v] of [['Total Exposure', totalExposure], ['Available Stock', availableStock]] as const) {
    if (!Number.isFinite(v)) throw new Error(`${label} must be a valid number.`);
    if (v < 0) throw new Error(`${label} cannot be negative.`);
  }
}

/** Builds a report version; derived figures always come from the central formulas. */
export function buildReport(
  station: Station,
  actor: StoredUser,
  base: Pick<WeeklyLog, 'reportingWeek' | 'version' | 'status'>,
  totalExposure: number,
  availableStock: number,
  comments: string | null,
): WeeklyLog {
  return {
    id: newId('rpt'),
    stationId: station.id,
    stationCode: station.stationCode,
    reportingWeek: base.reportingWeek,
    submittedAt: getNow().toISOString(),
    totalExposure,
    availableStock,
    availableCredit: calculateAvailableCredit(totalExposure, station.creditLimit),
    tarDebt: calculateTarDebt(availableStock, totalExposure),
    rmaId: actor.id,
    bmId: station.bmId ?? actor.bmId,
    status: base.status,
    version: base.version,
    comments,
  };
}

/** First submission of a station's weekly report. RMA only; one per station per reporting week. */
export function submitReport(actorId: string, input: NewWeeklyLogInput): WeeklyLog {
  const actor = getActor(actorId);
  requireRole(actor, ['RMA']); // permission matrix: only RMAs submit reports
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === input.stationId);
  if (!station) throw new Error('Station not found.');
  if (station.rmaId !== actor.id) throw new Error('This station is not assigned to you.');
  validateAmounts(input.totalExposure, input.availableStock);
  if (!isSunday(input.reportingWeek)) throw new Error('Reporting week must be a week-ending Sunday.');
  if (input.reportingWeek > currentWeekEnding(getNow())) throw new Error('You cannot report for a future week.');

  const reports = readCollection<WeeklyLog>(KEYS.reports);
  if (reports.some((r) => r.stationId === station.id && r.reportingWeek === input.reportingWeek)) {
    throw new Error('A weekly log has already been submitted for this station and reporting week.');
  }

  const report = buildReport(station, actor, { reportingWeek: input.reportingWeek, version: 1, status: 'Submitted' }, input.totalExposure, input.availableStock, input.comments?.trim() || null);
  batch(() => {
    saveCollection(KEYS.reports, [...reports, report]);
    recordAudit(actor.id, 'REPORT_SUBMITTED', 'report', report.id, `${stationRef(station)} week ending ${report.reportingWeek}, T.A.R ${report.tarDebt}`);
    maybeAlertPositiveTar(report, station, fullName(actor));
  });
  return report;
}
