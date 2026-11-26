import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useScopedData } from '../../../hooks/useScopedData';
import { useSubmissionStatus } from '../../../hooks/useSubmissionStatus';
import { computePerformance, stationSubmissionsForWeek } from '../../../services/submission.service';
import { stationCodeLabel } from '../../../types/station';
import type { PerformanceRow } from '../../../types/submission';
import { currentWeekEnding, deadlineFor, formatWeek, weeksBetween } from '../../../utils/date';
import { SummaryCard } from '../../dashboard/SummaryCard';
import { Badge } from '../../ui/Badge';
import { Select } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { AlertTriangle, CheckCircle2, ClipboardX, Clock, Percent, Users } from 'lucide-react';

const th = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

export function RmaPerformancePage() {
  // Scoped: a BM only sees their own RMAs, stations and reports.
  const { rmas: users, stations, reports, currentReports, bmNames, now } = useScopedData();
  const { statuses } = useSubmissionStatus();
  const current = currentWeekEnding(now);
  const [week, setWeek] = useState('all');
  const [rma, setRma] = useState('all');
  const [detail, setDetail] = useState<PerformanceRow | null>(null);

  const allWeeks = useMemo(() => {
    const first = reports.map((r) => r.reportingWeek).sort()[0] ?? current;
    return weeksBetween(first < current ? first : current, current);
  }, [reports, current]);
  const weeks = week === 'all' ? allWeeks : [week];

  const { rows, trend } = useMemo(
    () => computePerformance(users, stations, reports, weeks, bmNames, rma === 'all' ? null : rma),
    [users, stations, reports, weeks, bmNames, rma],
  );
  const { trend: allTrend } = useMemo(
    () => computePerformance(users, stations, reports, allWeeks, bmNames, rma === 'all' ? null : rma),
    [users, stations, reports, allWeeks, bmNames, rma],
  );

  const required = rows.reduce((n, r) => n + r.required, 0);
  const onTime = rows.reduce((n, r) => n + r.onTime, 0);
  const compliance = required > 0 ? (onTime / required) * 100 : 0;
  const submittedNow = statuses.filter((s) => s.status === 'Submitted').length;
  const overdue = statuses.filter((s) => s.status === 'Overdue').length;
  const outstandingWeek = week === 'all' ? current : week;
  const outstandingStations = stationSubmissionsForWeek(stations, currentReports, outstandingWeek, now).filter((s) => s.state !== 'Submitted').length;
  const rmaOptions = users.filter((u) => u.role === 'RMA' && stations.some((s) => s.rmaId === u.id));

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Based on actual submission timestamps versus each week's deadline (Monday 11:59 PM WAT). Current reporting week: {formatWeek(current)}.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <SummaryCard label="Total RMAs" value={String(statuses.length)} icon={Users} />
        <SummaryCard label="Submitted this week" value={String(submittedNow)} icon={CheckCircle2} />
        <SummaryCard label="Yet to submit" value={String(statuses.length - submittedNow)} icon={Clock} />
        <SummaryCard label="Overdue" value={String(overdue)} icon={AlertTriangle} />
        <SummaryCard label="Outstanding Stations" value={String(outstandingStations)} icon={ClipboardX} hint="Click for details" to={`/management/outstanding-stations?week=${outstandingWeek}`} />
        <SummaryCard label="Submission compliance" value={`${compliance.toFixed(1)}%`} icon={Percent} hint="On-time reports / required (filters applied)" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <Select label="Reporting week" value={week} onChange={(e) => setWeek(e.target.value)}>
          <option value="all">All weeks</option>
          {[...allWeeks].reverse().map((w) => (
            <option key={w} value={w}>{formatWeek(w)}</option>
          ))}
        </Select>
        <Select label="RMA" value={rma} onChange={(e) => setRma(e.target.value)}>
          <option value="all">All RMAs</option>
          {rmaOptions.map((u) => (
            <option key={u.id} value={u.id}>{u.firstName} {u.surname}</option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className={`${th} text-left`}>RMA Name</th>
                <th className={`${th} text-left`}>Assigned BM</th>
                <th className={`${th} text-right`}>Assigned Stations</th>
                <th className={`${th} text-right`}>Submitted Reports</th>
                <th className={`${th} text-right`}>Outstanding Reports</th>
                <th className={`${th} text-right`}>On-time</th>
                <th className={`${th} text-right`}>Late</th>
                <th className={`${th} text-right`}>Compliance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((r) => (
                <tr key={r.rma.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetail(r)}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetail(r);
                      }}
                      className="font-medium text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      {r.rma.firstName} {r.rma.surname}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{r.bmName}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{r.stationCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{r.submitted}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <span className={r.outstanding > 0 ? 'font-semibold text-red-600' : 'text-slate-700'}>{r.outstanding}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{r.onTime}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{r.late}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-slate-900">{r.compliance.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Weekly submissions</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="onTime" name="On time" stackId="a" fill="#013C1C" />
                <Bar dataKey="late" name="Late" stackId="a" fill="#f59e0b" />
                <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Compliance trend (all weeks)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={allTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Line type="monotone" dataKey="compliance" name="Compliance" stroke="#013C1C" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <Modal
        open={detail !== null}
        title={detail ? `Outstanding reports: ${detail.rma.firstName} ${detail.rma.surname}` : 'Outstanding reports'}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              {detail.outstanding === 0
                ? 'Every assigned station has a submitted report for the selected period.'
                : `${detail.outstanding} station ${detail.outstanding === 1 ? 'report has' : 'reports have'} not been submitted for ${week === 'all' ? 'the weeks shown' : formatWeek(week).toLowerCase()}.`}
            </p>
            {detail.outstanding > 0 && (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[520px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={`${th} text-left`}>Station Code</th>
                      <th className={`${th} text-left`}>Station Name</th>
                      <th className={`${th} text-left`}>Reporting Week</th>
                      <th className={`${th} text-left`}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[...detail.outstandingReports]
                      .sort((a, b) => b.week.localeCompare(a.week) || (a.station.stationCode ?? '').localeCompare(b.station.stationCode ?? ''))
                      .map(({ station, week: w }) => {
                        const overdueNow = now.getTime() > deadlineFor(w).getTime();
                        return (
                          <tr key={`${station.id}|${w}`}>
                            <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-900">{stationCodeLabel(station)}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">{station.stationName}</td>
                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-700">{formatWeek(w)}</td>
                            <td className="whitespace-nowrap px-4 py-2.5">
                              <Badge tone={overdueNow ? 'rose' : 'amber'}>{overdueNow ? 'Overdue' : 'Pending'}</Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
