import { CheckCircle2, Hand } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useSharedData } from '../../../hooks/useSharedData';
import { useSubmissionStatus } from '../../../hooks/useSubmissionStatus';
import { nudgeRma } from '../../../services/submission.service';
import { canNudge } from '../../../utils/permissions';
import { formatDateTime, formatWeek, recentWeeks } from '../../../utils/date';
import { SubmissionBadge } from '../../shared/StatusBadge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Select } from '../../ui/Input';
import { useToast } from '../../ui/Toast';

const th = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';

export function OutstandingSubmissionsPage() {
  const { user } = useAuth();
  const { now } = useSharedData();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const weekParam = params.get('week') ?? undefined;
  const { week, statuses } = useSubmissionStatus(weekParam);
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const mayNudge = user ? canNudge(user.role) : false; // permission matrix: Management only

  const weeks = recentWeeks(now, 8);
  const options = weeks.includes(week) ? weeks : [week, ...weeks];
  const rows = showAll ? statuses : statuses.filter((s) => s.status !== 'Submitted');

  const handleNudge = (rmaId: string, name: string) => {
    if (!user) return;
    setBusyId(rmaId);
    try {
      nudgeRma(user.id, rmaId, week);
      notify('success', `Nudge sent to ${name}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not send the nudge.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Outstanding submissions</h2>
          <p className="text-sm text-slate-500">
            {formatWeek(week)}. Deadline: Monday 11:59 PM WAT. {statuses.filter((s) => s.status !== 'Submitted').length} of {statuses.length} RMAs have outstanding reports.
          </p>
        </div>
        <div className="flex items-end gap-4">
          <Select label="Reporting week" value={week} onChange={(e) => setParams({ week: e.target.value })}>
            {options.map((w) => (
              <option key={w} value={w}>{formatWeek(w)}</option>
            ))}
          </Select>
          <label className="mb-2.5 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand" />
            Include submitted
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Everything is in" description="Every RMA has submitted all station reports for this week." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>RMA Name</th>
                  <th className={th}>RMA Email</th>
                  <th className={th}>Assigned BM</th>
                  <th className={th}>Assigned Stations</th>
                  <th className={th}>Submitted Reports</th>
                  <th className={th}>Outstanding Reports</th>
                  <th className={th}>Submission Status</th>
                  <th className={th}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows.map((s) => {
                  const name = `${s.rma.firstName} ${s.rma.surname}`;
                  return (
                    <tr key={s.rma.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.rma.email}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.bmName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.stationCount}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{s.submittedStations}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700" title={s.outstandingStationCodes.join(', ')}>{s.outstandingStations}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm"><SubmissionBadge state={s.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          {mayNudge ? (
                            <Button
                              size="sm"
                              icon={<Hand className="h-4 w-4" />}
                              loading={busyId === s.rma.id}
                              disabled={s.status === 'Submitted'}
                              onClick={() => handleNudge(s.rma.id, name)}
                            >
                              Nudge
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">Only Management can nudge</span>
                          )}
                          {s.lastNudgedAt && <span className="text-xs text-slate-500">Last nudged {formatDateTime(s.lastNudgedAt)}</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
