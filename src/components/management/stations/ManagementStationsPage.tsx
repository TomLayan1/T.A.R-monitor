import { History, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSharedData } from '../../../hooks/useSharedData';
import { useWeeklyReports } from '../../../hooks/useWeeklyReports';
import { stationCodeLabel, type Station } from '../../../types/station';
import type { WeeklyLog } from '../../../types/weekly-log';
import { formatNaira, formatNairaOrNA } from '../../../utils/currency';
import { deadlineFor, formatDateTime, formatWeek } from '../../../utils/date';
import { tarLevel, type TarLevel } from '../../../utils/tar-colours';
import { TarStatusBadge } from '../../shared/StatusBadge';
import { TarValue } from '../../shared/TarValue';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { FilterBar } from '../../ui/FilterBar';
import { FilterSelect } from '../../ui/FilterSelect';
import { Pagination } from '../../ui/Pagination';
import { SearchInput } from '../../ui/SearchInput';
import { Modal } from '../../ui/Modal';

interface Row {
  station: Station;
  log: WeeklyLog | null;
  rmaId: string | null;
  rma: string;
  bm: string;
}

type StatusFilter = 'all' | TarLevel | 'none';
type SortMode = 'code' | 'tar-desc';

const PAGE_SIZE = 10;
const th = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

/** Read-only view of every station. Management cannot modify submitted RMA figures here. */
export function ManagementStationsPage() {
  const { snapshots, reports, rmaNames, bmNames, users } = useWeeklyReports();
  const { amendmentHistory } = useSharedData();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [rmaFilter, setRmaFilter] = useState('all');
  const [bmFilter, setBmFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('code');
  const [historyFor, setHistoryFor] = useState<Station | null>(null);
  const [page, setPage] = useState(1);

  const rows: Row[] = useMemo(
    () =>
      snapshots.map(({ station, log }) => {
        const rmaUser = users.find((u) => u.id === station.rmaId);
        const bmId = station.bmId ?? log?.bmId ?? rmaUser?.bmId ?? null;
        const rmaId = station.rmaId;
        return {
          station,
          log,
          rmaId,
          rma: rmaId ? rmaNames[rmaId] ?? rmaId : 'Unassigned',
          bm: bmId ? bmNames[bmId] ?? bmId : '—',
        };
      }),
    [snapshots, users, rmaNames, bmNames],
  );

  const rmaOptions = useMemo(
    () => Array.from(new Map(rows.filter((r) => r.rmaId !== null).map((r) => [r.rmaId as string, r.rma])).entries()),
    [rows],
  );
  const bmOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.bm))).sort(), [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !(r.station.stationCode ?? '').toLowerCase().includes(q) && !r.station.stationName.toLowerCase().includes(q)) return false;
      if (rmaFilter !== 'all' && r.rmaId !== rmaFilter) return false;
      if (bmFilter !== 'all' && r.bm !== bmFilter) return false;
      if (statusFilter === 'none') return r.log === null;
      if (statusFilter !== 'all') return r.log !== null && tarLevel(r.log.tar) === statusFilter;
      return true;
    });
    return sort === 'tar-desc'
      ? [...list].sort((a, b) => (b.log?.tar ?? -Infinity) - (a.log?.tar ?? -Infinity))
      : [...list].sort((a, b) => (a.station.stationCode ?? '~').localeCompare(b.station.stationCode ?? '~') || a.station.stationName.localeCompare(b.station.stationName));
  }, [rows, query, rmaFilter, bmFilter, statusFilter, sort]);

  // Search, filters and sorting work together; any change returns to page 1.
  useEffect(() => setPage(1), [query, rmaFilter, bmFilter, statusFilter, sort]);
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const historyReports = historyFor
    ? reports
        .filter((r) => r.stationId === historyFor.id)
        .sort((a, b) => (a.reportingWeek !== b.reportingWeek ? b.reportingWeek.localeCompare(a.reportingWeek) : b.version - a.version))
    : [];
  const historyAmendments = historyFor ? amendmentHistory.filter((h) => h.stationId === historyFor.id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">All stations</h2>
        <p className="text-sm text-slate-500">Latest submitted figures for the stations in your scope. This view is read-only.</p>
      </div>

      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by station code or name"
          ariaLabel="Search stations"
          className="w-full sm:min-w-[16rem] sm:flex-1"
        />
        <FilterSelect value={rmaFilter} onChange={setRmaFilter} ariaLabel="Filter by RMA">
          <option value="all">All RMAs</option>
          {rmaOptions.map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={bmFilter} onChange={setBmFilter} ariaLabel="Filter by BM">
          <option value="all">All BMs</option>
          {bmOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} ariaLabel="Filter by exposure status">
          <option value="all">All TAR statuses</option>
          <option value="positive">Positive TAR (debt)</option>
          <option value="negative">Negative TAR</option>
          <option value="zero">Zero TAR</option>
          <option value="none">No report</option>
        </FilterSelect>
        <FilterSelect value={sort} onChange={(v) => setSort(v as SortMode)} ariaLabel="Sort stations">
          <option value="code">Sort: Station code</option>
          <option value="tar-desc">Sort: Highest TAR</option>
        </FilterSelect>
      </FilterBar>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {visible.length === 0 ? (
          <EmptyState icon={SearchX} title="No stations match your filters" description="Try clearing a filter or the search." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1950px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={`${th} text-left`}>Station Code</th>
                  <th className={`${th} text-left`}>Station Name</th>
                  <th className={`${th} text-right`}>Credit Limit</th>
                  <th className={`${th} text-right`}>Available Credit</th>
                  <th className={`${th} text-right`}>Trade Balance</th>
                  <th className={`${th} text-right`}>Available Stock</th>
                  <th className={`${th} text-right`}>CIT</th>
                  <th className={`${th} text-right`}>Total Stock</th>
                  <th className={`${th} text-right`}>TAR</th>
                  <th className={`${th} text-right`}>Exposure</th>
                  <th className={`${th} text-left`}>RMA</th>
                  <th className={`${th} text-left`}>BM</th>
                  <th className={`${th} text-left`}>Status</th>
                  <th className={`${th} text-left`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageRows.map(({ station, log, rma, bm }) => (
                  <tr key={station.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(station)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.stationName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNairaOrNA(log ? log.creditLimit : station.creditLimit)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{log ? formatNairaOrNA(log.availableCredit, '—') : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{log ? formatNaira(log.tradeBalance) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{log ? formatNaira(log.availableStock) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{log ? formatNaira(log.cit) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{log ? formatNaira(log.totalStock) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{log ? <TarValue value={log.tar} /> : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{log ? <TarValue value={log.exposure} /> : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{rma}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{bm}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">{log ? <TarStatusBadge value={log.tar} /> : <Badge tone="slate">No report</Badge>}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Button size="sm" variant="secondary" icon={<History className="h-4 w-4" />} onClick={() => setHistoryFor(station)}>
                        History
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onPageChange={setPage} />
      </div>

      <Modal open={historyFor !== null} title={historyFor ? `Reporting history: ${historyFor.stationName}` : 'Reporting history'} onClose={() => setHistoryFor(null)}>
        {historyFor && (
          <div className="space-y-4">
            {historyReports.length === 0 ? (
              <p className="text-sm text-slate-500">No reports have been submitted for this station.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[820px] w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Week</th>
                      <th className="px-3 py-2 text-left">Version</th>
                      <th className="px-3 py-2 text-left">Submitted</th>
                      <th className="px-3 py-2 text-right">Trade Balance</th>
                      <th className="px-3 py-2 text-right">Stock</th>
                      <th className="px-3 py-2 text-right">CIT</th>
                      <th className="px-3 py-2 text-right">TAR</th>
                      <th className="px-3 py-2 text-right">Exposure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyReports.map((r) => (
                      <tr key={r.id}>
                        <td className="whitespace-nowrap px-3 py-2">{formatWeek(r.reportingWeek)}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          v{r.version}{' '}
                          {r.version === 1 ? (
                            <Badge tone={r.submittedAt <= deadlineFor(r.reportingWeek).toISOString() ? 'green' : 'rose'}>
                              {r.submittedAt <= deadlineFor(r.reportingWeek).toISOString() ? 'On time' : 'Late'}
                            </Badge>
                          ) : (
                            <Badge tone="amber">Amended</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">{formatDateTime(r.submittedAt)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{formatNaira(r.tradeBalance)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{formatNaira(r.availableStock)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">{formatNaira(r.cit)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right"><TarValue value={r.tar} /></td>
                        <td className="whitespace-nowrap px-3 py-2 text-right"><TarValue value={r.exposure} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {historyAmendments.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Amendment audit trail</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {historyAmendments.map((h) => (
                    <li key={h.id} className="rounded-lg border border-slate-200 p-3">
                      <p>{formatWeek(h.reportingWeek)}: reason "{h.reason}"</p>
                      <p className="mt-1">
                        Original: trade balance {formatNaira(h.originalTradeBalance)}, stock {formatNaira(h.originalAvailableStock)}, CIT {formatNaira(h.originalCit)}, TAR <TarValue value={h.originalTar} />, Exposure <TarValue value={h.originalExposure} />
                      </p>
                      <p>
                        Updated: trade balance {formatNaira(h.updatedTradeBalance)}, stock {formatNaira(h.updatedAvailableStock)}, CIT {formatNaira(h.updatedCit)}, TAR <TarValue value={h.updatedTar} />, Exposure <TarValue value={h.updatedExposure} />
                      </p>
                      <p className="mt-1 text-xs text-slate-500">Approved {formatDateTime(h.approvalDate)}; resubmitted {formatDateTime(h.resubmissionDate)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
