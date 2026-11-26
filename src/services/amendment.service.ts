import type { AmendmentHistoryEntry, AmendmentRequest } from '../types/amendment';
import { stationRef, type Station } from '../types/station';
import type { NewNotification } from '../types/notification';
import type { StoredUser } from '../types/user';
import type { WeeklyLog } from '../types/weekly-log';
import { fullName } from '../types/user';
import { formatNaira } from '../utils/currency';
import { formatWeek } from '../utils/date';
import { canDecideAmendment, canRequestAmendment } from '../utils/permissions';
import { getActor } from './access';
import { recordAudit } from './audit.service';
import { getNow } from './clock.service';
import { associatedBm, maybeAlertPositiveTar, pushNotifications, riskUsers, routes } from './notification.service';
import { buildReport, listReports, validateAmounts, type WeeklyInputs } from './report.service';
import { KEYS, batch, newId, readCollection, saveCollection } from './storage';

export const listAmendments = (): AmendmentRequest[] => readCollection<AmendmentRequest>(KEYS.amendments);
export const listAmendmentHistory = (): AmendmentHistoryEntry[] =>
  readCollection<AmendmentHistoryEntry>(KEYS.amendmentHistory);

const latestVersionOf = (reports: WeeklyLog[], stationId: string, week: string): WeeklyLog | undefined =>
  reports
    .filter((r) => r.stationId === stationId && r.reportingWeek === week)
    .sort((a, b) => b.version - a.version)[0];

/** Amendment workflow notifications go ONLY to the people involved (never to every stakeholder). */
const dedupeUsers = (users: Array<StoredUser | undefined>): StoredUser[] => {
  const seen = new Set<string>();
  return users.filter((u): u is StoredUser => {
    if (!u || seen.has(u.id)) return false;
    seen.add(u.id);
    return true;
  });
};

function notifyEach(users: StoredUser[], make: (u: StoredUser) => Omit<NewNotification, 'userId' | 'dedupeKey'> & { key: string }): void {
  pushNotifications(
    users.map((u) => {
      const { key, ...rest } = make(u);
      return { ...rest, userId: u.id, dedupeKey: `${key}:${u.id}` };
    }),
  );
}

/** RMA asks for permission to amend a submitted report. This does NOT unlock the report. */
export function requestAmendment(actorId: string, reportId: string, reason: string): AmendmentRequest {
  const actor = getActor(actorId);
  if (!canRequestAmendment(actor.role)) throw new Error('You do not have permission to perform this action.');
  if (!reason.trim()) throw new Error('A reason for the edit is required.');

  const reports = listReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) throw new Error('Report not found.');
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === report.stationId);
  if (!station || station.rmaId !== actor.id) throw new Error('You can only request edits to reports for your own stations.');
  if (latestVersionOf(reports, report.stationId, report.reportingWeek)?.id !== report.id) {
    throw new Error('A newer version of this report already exists.');
  }
  const open = listAmendments().some(
    (a) => a.stationId === report.stationId && a.reportingWeek === report.reportingWeek && (a.status === 'Pending Approval' || a.status === 'Approved'),
  );
  if (open) throw new Error('An amendment request for this report is already open.');

  const request: AmendmentRequest = {
    id: newId('amd'),
    reportId: report.id,
    stationId: station.id,
    stationCode: station.stationCode,
    stationName: station.stationName,
    reportingWeek: report.reportingWeek,
    rmaId: actor.id,
    reason: reason.trim(),
    requestedAt: getNow().toISOString(),
    status: 'Pending Approval',
    decidedById: null,
    decidedAt: null,
    decisionComment: null,
    completedAt: null,
    resultingReportId: null,
    originalTradeBalance: report.tradeBalance,
    originalAvailableStock: report.availableStock,
    originalCit: report.cit,
  };

  batch(() => {
    saveCollection(KEYS.amendments, [...listAmendments(), request]);
    recordAudit(actor.id, 'AMENDMENT_REQUESTED', 'amendment', request.id, `${stationRef(station)} ${report.reportingWeek}: ${request.reason}`);
    // Recipients: Risk users and the associated BM.
    notifyEach(dedupeUsers([...riskUsers(), associatedBm(station)]), (u) => ({
      key: `amd-request:${request.id}`,
      category: 'Amendment Request',
      title: `Edit request: ${stationRef(station)}`,
      description: `${fullName(actor)} asked to amend ${station.stationName} (${formatWeek(report.reportingWeek).toLowerCase()}). Reason: ${request.reason}`,
      link: u.role === 'Risk' ? routes.mgmtApprovals : routes.mgmtStations(stationRef(station)),
      stationId: station.id,
      reportId: report.id,
      requestId: request.id,
    }));
  });
  return request;
}

/** Risk users only. Enforced here, not just in the UI. */
export function decideAmendment(actorId: string, requestId: string, decision: 'Approved' | 'Rejected', comment: string): AmendmentRequest {
  const actor = getActor(actorId);
  if (!canDecideAmendment(actor.role)) throw new Error('Only Risk users can approve or reject amendment requests.');
  const requests = listAmendments();
  const request = requests.find((a) => a.id === requestId);
  if (!request) throw new Error('Amendment request not found.');
  if (request.status !== 'Pending Approval') throw new Error('This request has already been decided.');

  const updated: AmendmentRequest = {
    ...request,
    status: decision,
    decidedById: actor.id,
    decidedAt: getNow().toISOString(),
    decisionComment: comment.trim() || null,
  };
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === request.stationId);
  const users = readCollection<StoredUser>(KEYS.users);
  batch(() => {
    saveCollection(KEYS.amendments, requests.map((a) => (a.id === requestId ? updated : a)));
    recordAudit(actor.id, decision === 'Approved' ? 'AMENDMENT_APPROVED' : 'AMENDMENT_REJECTED', 'amendment', requestId, comment.trim() || 'No comment');
    const approved = decision === 'Approved';
    // Recipients: the requesting RMA and the associated BM.
    notifyEach(dedupeUsers([users.find((u) => u.id === request.rmaId), station ? associatedBm(station) : undefined]), (u) => ({
      key: `amd-decision:${request.id}:${decision}`,
      category: approved ? 'Amendment Approved' : 'Amendment Rejected',
      title: approved ? `Edit approved: ${stationRef(request)}` : `Edit rejected: ${stationRef(request)}`,
      description: approved
        ? `The request for ${request.stationName} (${formatWeek(request.reportingWeek).toLowerCase()}) was approved by Risk. The RMA can now update Available Stock and Cash in Till (CIT). Trade Balance stays as recorded from S4HANA.`
        : `The request for ${request.stationName} (${formatWeek(request.reportingWeek).toLowerCase()}) was rejected by Risk.${updated.decisionComment ? ` Comment: ${updated.decisionComment}` : ''}`,
      link: u.role === 'RMA' ? routes.rmaWeeklyLogs(stationRef(request)) : routes.mgmtStations(stationRef(request)),
      stationId: request.stationId,
      reportId: request.reportId,
      requestId: request.id,
    }));
  });
  return updated;
}

/** RMA resubmits an approved amendment: creates version n+1, preserves the original, locks again. */
export function completeAmendment(actorId: string, requestId: string, inputs: WeeklyInputs): WeeklyLog {
  const actor = getActor(actorId);
  if (!canRequestAmendment(actor.role)) throw new Error('You do not have permission to perform this action.');
  const requests = listAmendments();
  const request = requests.find((a) => a.id === requestId);
  if (!request || request.rmaId !== actor.id) throw new Error('Amendment request not found.');
  if (request.status !== 'Approved') throw new Error('This report is not unlocked for editing.');
  validateAmounts(inputs.tradeBalance, inputs.availableStock, inputs.cit);

  const reports = listReports();
  const original = reports.find((r) => r.id === request.reportId);
  const station = readCollection<Station>(KEYS.stations).find((s) => s.id === request.stationId);
  if (!original || !station) throw new Error('Report not found.');
  if (latestVersionOf(reports, original.stationId, original.reportingWeek)?.id !== original.id) {
    throw new Error('A newer version of this report already exists.');
  }

  // The RMA inputs (Trade Balance, Available Stock, CIT) change. The S4HANA Credit Limit recorded with the original
  // report is carried over unchanged, as are the reporting week and comments.
  const updatedReport = buildReport(
    station,
    actor,
    { reportingWeek: original.reportingWeek, version: original.version + 1, status: 'Amended' },
    inputs,
    original.comments ?? null,
    original.creditLimit,
  );
  const now = getNow().toISOString();
  const history: AmendmentHistoryEntry = {
    id: newId('ahi'),
    requestId: request.id,
    stationId: station.id,
    stationCode: station.stationCode,
    reportingWeek: original.reportingWeek,
    originalReportId: original.id,
    updatedReportId: updatedReport.id,
    originalTradeBalance: original.tradeBalance,
    originalAvailableStock: original.availableStock,
    originalCit: original.cit,
    originalTotalStock: original.totalStock,
    originalTar: original.tar,
    originalExposure: original.exposure,
    updatedTradeBalance: updatedReport.tradeBalance,
    updatedAvailableStock: updatedReport.availableStock,
    updatedCit: updatedReport.cit,
    updatedTotalStock: updatedReport.totalStock,
    updatedTar: updatedReport.tar,
    updatedExposure: updatedReport.exposure,
    requestingRmaId: request.rmaId,
    approvedById: request.decidedById ?? '',
    reason: request.reason,
    approvalDate: request.decidedAt ?? now,
    resubmissionDate: now,
  };

  batch(() => {
    saveCollection(KEYS.reports, [...reports, updatedReport]); // original version is kept
    saveCollection(KEYS.amendmentHistory, [...listAmendmentHistory(), history]);
    saveCollection(
      KEYS.amendments,
      requests.map((a) => (a.id === request.id ? { ...a, status: 'Completed' as const, completedAt: now, resultingReportId: updatedReport.id } : a)),
    );
    recordAudit(actor.id, 'AMENDMENT_COMPLETED', 'report', updatedReport.id, `${stationRef(station)} v${original.version}->v${updatedReport.version}`);
    // The amended figures are evaluated like any other report: any positive TAR notifies every user.
    maybeAlertPositiveTar(updatedReport, station, fullName(actor));
    // Workflow notice: Risk users and the associated BM only.
    notifyEach(dedupeUsers([...riskUsers(), associatedBm(station)]), (u) => ({
      key: `amd-complete:${request.id}`,
      category: 'Amendment Completed',
      title: `Amended report resubmitted: ${stationRef(station)}`,
      description: `${fullName(actor)} resubmitted ${station.stationName} for the ${formatWeek(original.reportingWeek).toLowerCase()}. TAR changed from ${formatNaira(original.tar)} to ${formatNaira(updatedReport.tar)}; Exposure from ${formatNaira(original.exposure)} to ${formatNaira(updatedReport.exposure)}.`,
      link: u.role === 'Risk' ? routes.mgmtApprovals : routes.mgmtStations(stationRef(station)),
      stationId: station.id,
      reportId: updatedReport.id,
      requestId: request.id,
    }));
  });
  return updatedReport;
}
