import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useScopedData } from '../../../hooks/useScopedData';
import { stationSubmissionsForWeek } from '../../../services/submission.service';
import { stationCodeLabel } from '../../../types/station';
import { currentWeekEnding, formatWeek, recentWeeks } from '../../../utils/date';
import { Badge } from '../../ui/Badge';
import { EmptyState } from '../../ui/EmptyState';
import { FilterSelect } from '../../ui/FilterSelect';
import { Pagination } from '../../ui/Pagination';

const PAGE_SIZE = 10;
const th = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Stations that have NOT submitted a valid report for the selected reporting week, within the viewer's scope.
 * Opened from the Outstanding Stations KPI (dashboard) and from R.M.A Performance.
 */
export function OutstandingStationsPage() {
  const { stations, currentReports, now, users, bmNames, rmaNames } = useScopedData();
  const [params, setParams] = useSearchParams();
  const week = params.get('week') ?? currentWeekEnding(now);
  const [page, setPage] = useState(1);

  const weeks = recentWeeks(now, 8);
  const options = weeks.includes(week) ? weeks : [week, ...weeks];

  const rows = useMemo(
    () => stationSubmissionsForWeek(stations, currentReports, week, now).filter((r) => r.state !== 'Submitted'),
    [stations, currentReports, week, now],
  );
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const bmFor = (s: { bmId: string | null; rmaId: string | null }) => {
    const id = s.bmId ?? users.find((u) => u.id === s.rmaId)?.bmId ?? null;
    return id ? bmNames[id] ?? id : '—';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Outstanding stations</h2>
          <p className="text-sm text-slate-500">
            {formatWeek(week)}. {rows.length} station{rows.length === 1 ? '' : 's'} without a submitted report. Deadline: Monday 11:59 PM WAT.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FilterSelect value={week} onChange={(v) => { setParams({ week: v }); setPage(1); }} ariaLabel="Reporting week">
            {options.map((w) => (
              <option key={w} value={w}>{formatWeek(w)}</option>
            ))}
          </FilterSelect>
          <Link to={`/management/outstanding?week=${week}`} className="whitespace-nowrap text-sm font-medium text-brand hover:underline">
            View by RMA
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No outstanding stations" description="Every station in your scope has submitted a report for this week." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[950px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Station Code</th>
                    <th className={th}>Station Name</th>
                    <th className={th}>Region</th>
                    <th className={th}>Assigned RMA</th>
                    <th className={th}>Assigned BM</th>
                    <th className={th}>Reporting Week</th>
                    <th className={th}>Submission Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visible.map(({ station, state }) => (
                    <tr key={station.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(station)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.stationName}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.region ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.rmaId ? rmaNames[station.rmaId] ?? station.rmaId : '—'}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{bmFor(station)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatWeek(week)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Badge tone={state === 'Overdue' ? 'rose' : 'amber'}>{state === 'Overdue' ? 'Overdue' : 'Pending'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}
