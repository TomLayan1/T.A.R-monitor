import { Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useScopedData } from '../../hooks/useScopedData';
import { exportTarWorkbook } from '../../services/excel.service';
import { stationCodeLabel } from '../../types/station';
import { sortLogsNewestFirst } from '../../utils/calculations';
import { formatNairaOrNA, formatNaira } from '../../utils/currency';
import { currentWeekEnding, formatDateTime, formatWeek, weeksBetween } from '../../utils/date';
import { hasOrgWideAccess } from '../../utils/permissions';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FilterSelect } from '../ui/FilterSelect';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../ui/Toast';
import { TarValue } from './TarValue';

const PAGE_SIZE = 10;
const th = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Reports for RMA, BM and the org-wide roles. Everything shown or exported is limited to the user's
 * scope (RMA: own stations; BM: assigned stations; Head of Retail / Risk / Management: all).
 */
export function ReportsWorkspace() {
  const { user, stations, currentReports, now } = useScopedData();
  const { notify } = useToast();
  const current = currentWeekEnding(now);

  const allWeeks = useMemo(() => {
    const weeks = currentReports.map((r) => r.reportingWeek).sort();
    const first = weeks[0] ?? current;
    const last = weeks[weeks.length - 1] ?? current;
    return weeksBetween(first < current ? first : current, last > current ? last : current);
  }, [currentReports, current]);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [stationId, setStationId] = useState('all');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const fromWeek = from || allWeeks[0] || current;
  const toWeek = to || allWeeks[allWeeks.length - 1] || current;
  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);

  const rows = useMemo(
    () =>
      sortLogsNewestFirst(
        currentReports.filter((r) => r.reportingWeek >= fromWeek && r.reportingWeek <= toWeek && (stationId === 'all' || r.stationId === stationId)),
      ),
    [currentReports, fromWeek, toWeek, stationId],
  );
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const sheets = fromWeek <= toWeek ? weeksBetween(fromWeek, toWeek) : [];
  const scopeText = user && hasOrgWideAccess(user.role) ? 'every station' : user?.role === 'BM' ? 'your assigned stations' : 'your assigned stations';

  const reset = () => setPage(1);

  const handleExport = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const filename = await exportTarWorkbook(user.id, fromWeek, toWeek, stationId === 'all' ? null : stationId);
      notify('success', `Downloaded ${filename}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not generate the report.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Weekly reports</h2>
          <p className="text-sm text-slate-500">
            Historical weekly reports for {scopeText}. Excel downloads have one worksheet per week, named by the Sunday week-ending date.
          </p>
        </div>
        <Button onClick={handleExport} loading={busy} disabled={sheets.length === 0 || stations.length === 0} icon={<Download className="h-4 w-4" />}>
          Download Excel report
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterSelect value={stationId} onChange={(v) => { setStationId(v); reset(); }} ariaLabel="Filter by station" className="sm:min-w-[16rem]">
          <option value="all">All stations</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.stationName} ({stationCodeLabel(s)})
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={fromWeek} onChange={(v) => { setFrom(v); reset(); }} ariaLabel="From reporting week">
          {allWeeks.map((w) => (
            <option key={w} value={w}>From: {formatWeek(w)}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={toWeek} onChange={(v) => { setTo(v); reset(); }} ariaLabel="To reporting week">
          {allWeeks.map((w) => (
            <option key={w} value={w}>To: {formatWeek(w)}</option>
          ))}
        </FilterSelect>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title="No reports in this period" description="Try a wider reporting period or a different station." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={`${th} text-left`}>Reporting Week</th>
                    <th className={`${th} text-left`}>Station Code</th>
                    <th className={`${th} text-left`}>Station Name</th>
                    <th className={`${th} text-right`}>Credit Limit</th>
                    <th className={`${th} text-right`}>Available Credit</th>
                    <th className={`${th} text-right`}>Total Exposure</th>
                    <th className={`${th} text-right`}>Available Stock</th>
                    <th className={`${th} text-right`}>T.A.R/Debt</th>
                    <th className={`${th} text-left`}>Submitted</th>
                    <th className={`${th} text-left`}>Version</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visible.map((r) => {
                    const st = stationById.get(r.stationId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatWeek(r.reportingWeek)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{st ? stationCodeLabel(st) : 'Pending'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{st?.stationName ?? '—'}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNairaOrNA(st?.creditLimit ?? null)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNairaOrNA(r.availableCredit, '—')}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(r.totalExposure)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(r.availableStock)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm"><TarValue value={r.tarDebt} /></td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDateTime(r.submittedAt)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">{r.version > 1 ? <Badge tone="amber">Amended v{r.version}</Badge> : <Badge tone="green">v1</Badge>}</td>
                      </tr>
                    );
                  })}
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
