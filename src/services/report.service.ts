import { stationRef, type Station } from '../types/station';
import type { NewWeeklyLogInput, WeeklyLog } from '../types/weekly-log';
import { fullName } from '../types/user';
import type { StoredUser } from '../types/user';
import { calculateWeeklyFigures } from '../utils/calculations';
import { formatNaira } from '../utils/currency';
import { currentWeekEnding, isSunday } from '../utils/date';
import { getActor, requireRole } from './access';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { maybeAlertPositiveTar } from './notification.service';
import { s4hana } from './s4hana.service';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';

export const listReports = (): WeeklyLog[] => readCollection<WeeklyLog>(KEYS.reports);

/** RMA inputs: Trade Balance, Available Stock and Cash in Till (CIT). */
export function validateAmounts(tradeBalance: number, availableStock: number, cit: number): void {
  for (const [label, v] of [['Trade Balance', tradeBalance], ['Available Stock', availableStock], ['Cash in Till (CIT)', cit]] as const) {
    if (!Number.isFinite(v)) throw new Error(`${label} must be a valid number.`);
    if (v < 0) throw new Error(`${label} cannot be negative.`);
  }
}

/** The station's credit limit, read through the S4HANA adapter only (never taken from the UI). */
export const creditLimitFor = (station: Station): number | null => s4hana.getCreditLimit(station);

/** The RMA-entered amounts of one weekly log. */
export interface WeeklyInputs {
  tradeBalance: number;
  availableStock: number;
  cit: number;
}

/**
 * Builds a report version. Derived figures always come from the central formulas. `creditLimit` lets an
 * amendment keep the credit limit that was recorded with the original report.
 */
export function buildReport(
  station: Station,
  actor: StoredUser,
  base: Pick<WeeklyLog, 'reportingWeek' | 'version' | 'status'>,
  inputs: WeeklyInputs,
  comments: string | null,
  creditLimit: number | null = creditLimitFor(station),
): WeeklyLog {
  const figures = calculateWeeklyFigures({ creditLimit, ...inputs });
  return {
    id: newId('rpt'),
    stationId: station.id,
    stationCode: station.stationCode,
    reportingWeek: base.reportingWeek,
    submittedAt: getNow().toISOString(),
    ...figures,
    rmaId: actor.id,
    bmId: station.bmId ?? actor.bmId,
    status: base.status,
    version: base.version,
    comments,
    legacy: null,
  };
}

/** First submission of a station's weekly report. RMA only; one per station per reporting week. */
export function submitReport(actorId: string, input: NewWeeklyLogInput): WeeklyLog {
  const actor = getActor(actorId);
  requireRole(actor, ['RMA']); // permission matrix: only RMAs submit reports
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === input.stationId);
  if (!station) throw new Error('Station not found.');
  if (station.rmaId !== actor.id) throw new Error('This station is not assigned to you.');
  validateAmounts(input.tradeBalance, input.availableStock, input.cit);
  if (!isSunday(input.reportingWeek)) throw new Error('Reporting week must be a week-ending Sunday.');
  if (input.reportingWeek > currentWeekEnding(getNow())) throw new Error('You cannot report for a future week.');

  const reports = readCollection<WeeklyLog>(KEYS.reports);
  if (reports.some((r) => r.stationId === station.id && r.reportingWeek === input.reportingWeek)) {
    throw new Error('A weekly log has already been submitted for this station and reporting week.');
  }

  const report = buildReport(station, actor, { reportingWeek: input.reportingWeek, version: 1, status: 'Submitted' }, { tradeBalance: input.tradeBalance, availableStock: input.availableStock, cit: input.cit }, input.comments?.trim() || null);
  batch(() => {
    saveCollection(KEYS.reports, [...reports, report]);
    recordAudit(actor.id, 'REPORT_SUBMITTED', 'report', report.id, `${stationRef(station)} week ending ${report.reportingWeek}: trade balance ${formatNaira(report.tradeBalance)}, stock ${formatNaira(report.availableStock)}, CIT ${formatNaira(report.cit)}, TAR ${formatNaira(report.tar)}, exposure ${formatNaira(report.exposure)}`);
    maybeAlertPositiveTar(report, station, fullName(actor));
  });
  return report;
}
