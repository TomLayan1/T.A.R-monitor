import type { NewNotification, NudgeRecord, SchedulerMarker } from '../types/notification';
import type { PerformanceRow, PerformanceTrendPoint, RmaSubmissionStatus } from '../types/submission';
import { stationRef, type Station } from '../types/station';
import type { SessionUser } from '../types/user';
import { fullName, roleLabel } from '../types/user';
import { canNudge } from '../utils/permissions';
import type { WeeklyLog } from '../types/weekly-log';
import { REMINDER_HOURS_WAT, currentWeekEnding, deadlineFor, formatWeek, reminderSlotTime } from '../utils/date';
import { getActor } from './access';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { managementUsers, pushNotifications, routes } from './notification.service';
import { listReports } from './report.service';
import { listStations } from './stationService';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';
import { bmNameMap, getSessionUsers } from './userService';

/**
 * Submission state is ALWAYS derived from real reports + the deadline - never stored or typed in.
 * Submitted = every assigned station has a report for the week.
 * Pending   = something outstanding and the deadline has not passed.
 * Overdue   = something outstanding and Monday 11:59 PM WAT has passed.
 * A missing report is never treated as a zero-value report.
 */
export function computeRmaStatuses(
  users: SessionUser[],
  stations: Station[],
  reports: WeeklyLog[],
  weekEnding: string,
  now: Date,
  bmNames: Record<string, string>,
  nudges: NudgeRecord[],
): RmaSubmissionStatus[] {
  const reported = new Set(reports.filter((r) => r.reportingWeek === weekEnding).map((r) => r.stationId));
  const pastDeadline = now.getTime() > deadlineFor(weekEnding).getTime();
  const result: RmaSubmissionStatus[] = [];
  for (const rma of users.filter((u) => u.role === 'RMA')) {
    const mine = stations.filter((s) => s.rmaId === rma.id);
    if (mine.length === 0) continue;
    const missing = mine.filter((s) => !reported.has(s.id));
    const lastNudge = nudges
      .filter((n) => n.rmaId === rma.id && n.reportingWeek === weekEnding)
      .sort((a, b) => b.sentAt.localeCompare(a.sentAt))[0];
    result.push({
      rma,
      bmName: rma.bmId ? bmNames[rma.bmId] ?? rma.bmId : '—',
      weekEnding,
      stationCount: mine.length,
      submittedStations: mine.length - missing.length,
      outstandingStations: missing.length,
      outstandingStationCodes: missing.map((s) => stationRef(s)),
      status: missing.length === 0 ? 'Submitted' : pastDeadline ? 'Overdue' : 'Pending',
      lastNudgedAt: lastNudge?.sentAt ?? null,
    });
  }
  return result;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/**
 * Idempotent scheduler (runs on an interval and whenever data changes). Reminder slots (WAT):
 * 9am, 11am, 1pm, 3pm, 5pm, 7pm, 9pm, 11pm on the Monday deadline day; a final overdue notice
 * once 11:59 PM has passed. Markers + dedupe keys make repeated runs harmless.
 */
export function runScheduler(): void {
  const now = getNow();
  const week = currentWeekEnding(now);
  const markers = readCollection<SchedulerMarker>(KEYS.submissionStatus);
  const has = (key: string) => markers.some((m) => m.key === key);
  const deadline = deadlineFor(week);
  const due = REMINDER_HOURS_WAT.filter((h) => reminderSlotTime(week, h) <= now && !has(`reminder:${week}:${h}`));
  const needsFinal = now > deadline && !has(`final:${week}`);
  if (due.length === 0 && !needsFinal) return;

  const statuses = computeRmaStatuses(getSessionUsers(), listStations(), listReports(), week, now, bmNameMap(), []);
  const outstanding = statuses.filter((s) => s.status !== 'Submitted');
  const n = outstanding.length;
  const newMarkers: SchedulerMarker[] = due.map((h) => ({ key: `reminder:${week}:${h}`, at: now.toISOString() }));
  const items: NewNotification[] = [];
  const base = { stationId: null, reportId: null, requestId: null };

  if (due.length > 0 && n > 0 && now <= deadline) {
    const slot = due[due.length - 1]; // catch-up: only the latest due slot produces a notice
    for (const u of managementUsers()) {
      items.push({
        ...base,
        userId: u.id,
        category: 'Pending Submission',
        title: 'Weekly submissions outstanding',
        description: `${n} ${plural(n, 'RMA is', 'RMAs are')} yet to submit their report. Click to see who.`,
        link: routes.mgmtOutstanding(week),
        dedupeKey: `reminder:${week}:${slot}:${u.id}`,
      });
    }
    for (const s of outstanding) {
      items.push({
        ...base,
        userId: s.rma.id,
        category: 'Reminder',
        title: 'Weekly report reminder',
        description: `You have ${s.outstandingStations} outstanding station ${plural(s.outstandingStations, 'report', 'reports')} for the ${formatWeek(week).toLowerCase()}. Deadline: Monday 11:59 PM WAT.`,
        link: routes.rmaStations,
        dedupeKey: `rma-reminder:${week}:${slot}:${s.rma.id}`,
      });
    }
  }

  if (needsFinal) {
    newMarkers.push({ key: `final:${week}`, at: now.toISOString() });
    if (n > 0) {
      for (const u of managementUsers()) {
        items.push({
          ...base,
          userId: u.id,
          category: 'Overdue Reports',
          title: 'Weekly reports overdue',
          description: `${n} ${plural(n, 'RMA failed', 'RMAs failed')} to submit their weekly reports before the deadline. Click to view outstanding submissions.`,
          link: routes.mgmtOutstanding(week),
          dedupeKey: `final:${week}:${u.id}`,
        });
      }
      for (const s of outstanding) {
        items.push({
          ...base,
          userId: s.rma.id,
          category: 'Overdue Reports',
          title: 'Your weekly reports are overdue',
          description: `${s.outstandingStations} station ${plural(s.outstandingStations, 'report', 'reports')} for the ${formatWeek(week).toLowerCase()} missed the Monday deadline: ${s.outstandingStationCodes.join(', ')}.`,
          link: routes.rmaStations,
          dedupeKey: `rma-final:${week}:${s.rma.id}`,
        });
      }
    }
  }

  batch(() => {
    saveCollection(KEYS.submissionStatus, [...markers, ...newMarkers]);
    pushNotifications(items);
  });
}

export const listNudges = (): NudgeRecord[] => readCollection<NudgeRecord>(KEYS.nudges);

export function nudgeRma(actorId: string, rmaId: string, weekEnding: string): NudgeRecord {
  const actor = getActor(actorId);
  if (!canNudge(actor.role)) throw new Error('Only Management users can nudge RMAs.');
  const now = getNow();
  const statuses = computeRmaStatuses(getSessionUsers(), listStations(), listReports(), weekEnding, now, bmNameMap(), listNudges());
  const status = statuses.find((s) => s.rma.id === rmaId);
  if (!status) throw new Error('RMA not found.');
  if (status.status === 'Submitted') throw new Error('This RMA has already submitted every station report for the week.');

  const record: NudgeRecord = {
    id: newId('ndg'),
    rmaId,
    senderId: actor.id,
    reportingWeek: weekEnding,
    outstandingStations: status.outstandingStations,
    sentAt: now.toISOString(),
  };
  batch(() => {
    saveCollection(KEYS.nudges, [...listNudges(), record]);
    recordAudit(actor.id, 'RMA_NUDGED', 'user', rmaId, `${status.outstandingStations} outstanding for ${weekEnding}`);
    pushNotifications([
      {
        userId: rmaId,
        category: 'Nudge',
        title: `Nudge from ${fullName(actor)}`,
        description: `${fullName(actor)} (${roleLabel(actor.role)}) is asking you to submit ${status.outstandingStations} outstanding station ${plural(status.outstandingStations, 'report', 'reports')} for the ${formatWeek(weekEnding).toLowerCase()}: ${status.outstandingStationCodes.join(', ')}.`,
        link: routes.rmaStations,
        stationId: null,
        reportId: null,
        requestId: null,
        dedupeKey: null,
      },
    ]);
  });
  return record;
}

/**
 * Compliance is computed from real submission timestamps vs. each week's deadline
 * (first submission, version 1) - never from a manually entered status.
 */
export function computePerformance(
  users: SessionUser[],
  stations: Station[],
  reports: WeeklyLog[],
  weeks: string[],
  bmNames: Record<string, string>,
  rmaFilter: string | null,
): { rows: PerformanceRow[]; trend: PerformanceTrendPoint[] } {
  const rmas = users.filter((u) => u.role === 'RMA' && (!rmaFilter || u.id === rmaFilter));
  const firstSubmission = new Map<string, WeeklyLog>();
  for (const r of reports) {
    const key = `${r.stationId}|${r.reportingWeek}`;
    const cur = firstSubmission.get(key);
    if (!cur || r.version < cur.version) firstSubmission.set(key, r);
  }
  const trendMap = new Map<string, PerformanceTrendPoint>(
    weeks.map((w) => [w, { week: w, required: 0, onTime: 0, late: 0, outstanding: 0, compliance: 0 }]),
  );
  const rows: PerformanceRow[] = [];
  for (const rma of rmas) {
    const mine = stations.filter((s) => s.rmaId === rma.id);
    if (mine.length === 0) continue;
    const row: PerformanceRow = {
      rma,
      bmName: rma.bmId ? bmNames[rma.bmId] ?? rma.bmId : '—',
      stationCount: mine.length,
      required: 0,
      submitted: 0,
      outstanding: 0,
      onTime: 0,
      late: 0,
      compliance: 0,
    };
    for (const week of weeks) {
      const deadline = deadlineFor(week).toISOString();
      const point = trendMap.get(week)!;
      for (const st of mine) {
        row.required += 1;
        point.required += 1;
        const first = firstSubmission.get(`${st.id}|${week}`);
        if (!first) {
          row.outstanding += 1;
          point.outstanding += 1;
        } else {
          row.submitted += 1;
          if (first.submittedAt <= deadline) {
            row.onTime += 1;
            point.onTime += 1;
          } else {
            row.late += 1;
            point.late += 1;
          }
        }
      }
    }
    row.compliance = row.required > 0 ? (row.onTime / row.required) * 100 : 0;
    rows.push(row);
  }
  const trend = weeks.map((w) => {
    const p = trendMap.get(w)!;
    return { ...p, compliance: p.required > 0 ? (p.onTime / p.required) * 100 : 0 };
  });
  return { rows, trend };
}

export interface StationSubmission {
  station: Station;
  report: WeeklyLog | null;
  state: 'Submitted' | 'Pending' | 'Overdue';
}

/**
 * Station-level submission state for one reporting week. Only stations that have an assigned RMA can be
 * expected to report. A station is Submitted when a valid report exists for that week; otherwise it is
 * Pending until Monday 11:59 PM WAT and Overdue afterwards. A missing report is never treated as zero.
 */
export function stationSubmissionsForWeek(stations: Station[], reports: WeeklyLog[], week: string, now: Date): StationSubmission[] {
  const byStation = new Map<string, WeeklyLog>();
  for (const r of reports) {
    if (r.reportingWeek !== week) continue;
    const cur = byStation.get(r.stationId);
    if (!cur || r.version > cur.version) byStation.set(r.stationId, r);
  }
  const pastDeadline = now.getTime() > deadlineFor(week).getTime();
  return stations
    .filter((s) => s.rmaId !== null)
    .map((station) => {
      const report = byStation.get(station.id) ?? null;
      return { station, report, state: report ? ('Submitted' as const) : pastDeadline ? ('Overdue' as const) : ('Pending' as const) };
    });
}
