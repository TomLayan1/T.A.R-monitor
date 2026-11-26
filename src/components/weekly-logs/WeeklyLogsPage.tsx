import { ClipboardList, Loader2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAmendments } from '../../hooks/useAmendments';
import { useStations } from '../../hooks/useStations';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import { stationCodeLabel } from '../../types/station';
import { sortLogsNewestFirst } from '../../utils/calculations';
import { formatNaira, formatNairaOrNA } from '../../utils/currency';
import { formatDate, formatDateTime, formatWeek } from '../../utils/date';
import { TarValue } from '../shared/TarValue';
import { Badge } from '../ui/Badge';
import { buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FilterBar } from '../ui/FilterBar';
import { FilterSelect } from '../ui/FilterSelect';
import { SearchInput } from '../ui/SearchInput';
import { Modal } from '../ui/Modal';
import { AmendReportModal } from './AmendReportModal';
import { EditRequestModal } from './EditRequestModal';
import { WeeklyLogsTable, displayStatus, type LogListRow } from './WeeklyLogsTable';

type SortMode = 'newest' | 'tar-desc' | 'tar-asc' | 'exposure-desc' | 'exposure-asc';

export function WeeklyLogsPage() {
  const { stations, loading: stationsLoading } = useStations();
  const { logs, amendmentFor, rmaName, bmName, loading: logsLoading } = useWeeklyLogs();
  const { history } = useAmendments();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [week, setWeek] = useState('all');
  const [sort, setSort] = useState<SortMode>('newest');
  const [selected, setSelected] = useState<LogListRow | null>(null);
  const [editRow, setEditRow] = useState<LogListRow | null>(null);
  const [amendRow, setAmendRow] = useState<LogListRow | null>(null);

  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations]);
  const weeks = useMemo(() => Array.from(new Set(logs.map((l) => l.reportingWeek))).sort().reverse(), [logs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list: LogListRow[] = [];
    for (const log of sortLogsNewestFirst(logs)) {
      const station = stationById.get(log.stationId);
      if (!station) continue;
      if (week !== 'all' && log.reportingWeek !== week) continue;
      if (q && !(station.stationCode ?? '').toLowerCase().includes(q) && !station.stationName.toLowerCase().includes(q)) continue;
      list.push({ log, station, rma: rmaName(log.rmaId), bm: bmName(log.bmId), amendment: amendmentFor(log.stationId, log.reportingWeek) });
    }
    if (sort === 'tar-desc') list.sort((a, b) => b.log.tar - a.log.tar);
    if (sort === 'tar-asc') list.sort((a, b) => a.log.tar - b.log.tar);
    if (sort === 'exposure-desc') list.sort((a, b) => b.log.exposure - a.log.exposure);
    if (sort === 'exposure-asc') list.sort((a, b) => a.log.exposure - b.log.exposure);
    return list;
  }, [logs, stationById, query, week, sort, rmaName, bmName, amendmentFor]);

  if (stationsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading weekly logs...
      </div>
    );
  }

  const handleEdit = (row: LogListRow) => {
    // Approved request -> the report is unlocked and can be amended; otherwise raise a request.
    if (row.amendment?.status === 'Approved') setAmendRow(row);
    else setEditRow(row);
  };

  const detail = (label: string, value: ReactNode) => (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );

  const selectedHistory = selected
    ? history.filter((h) => h.stationId === selected.station.id && h.reportingWeek === selected.log.reportingWeek)
    : [];
  const selectedStatus = selected ? displayStatus(selected) : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Submitted weekly logs</h2>
        <p className="text-sm text-slate-500">
          All logs submitted for your assigned stations. Submitted logs are read-only; use Edit to ask Risk for a correction.
        </p>
      </div>

      <FilterBar>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search by station code or name"
          ariaLabel="Search weekly logs"
          className="w-full sm:min-w-[16rem] sm:flex-1"
        />
        <FilterSelect value={week} onChange={setWeek} ariaLabel="Filter by reporting week">
          <option value="all">All reporting weeks</option>
          {weeks.map((w) => (
            <option key={w} value={w}>
              {formatWeek(w)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={sort} onChange={(v) => setSort(v as SortMode)} ariaLabel="Sort weekly logs">
          <option value="newest">Sort: Newest first</option>
          <option value="tar-desc">Sort: TAR high to low</option>
          <option value="tar-asc">Sort: TAR low to high</option>
          <option value="exposure-desc">Sort: Exposure high to low</option>
          <option value="exposure-asc">Sort: Exposure low to high</option>
        </FilterSelect>
      </FilterBar>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={logs.length === 0 ? 'No weekly logs submitted yet' : 'No logs match your filters'}
            description={logs.length === 0 ? 'Open a station to submit its first weekly log.' : 'Try clearing the search or reporting week filter.'}
            action={
              logs.length === 0 ? (
                <Link to="/rma/stations" className={buttonClasses('primary')}>
                  Go to Stations
                </Link>
              ) : undefined
            }
          />
        ) : (
          <WeeklyLogsTable rows={rows} onView={setSelected} onEdit={handleEdit} />
        )}
      </div>

      <Modal open={selected !== null} title="Weekly log details" onClose={() => setSelected(null)}>
        {selected && selectedStatus && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selectedStatus.tone}>{selectedStatus.label}</Badge>
              <span className="text-sm text-slate-500">
                Version {selected.log.version}, submitted {formatDateTime(selected.log.submittedAt)} - read-only
              </span>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {detail('Reporting week', formatWeek(selected.log.reportingWeek))}
              {detail('Station', `${selected.station.stationName} (${stationCodeLabel(selected.station)})`)}
              {detail('Credit limit (S4HANA)', formatNairaOrNA(selected.log.creditLimit))}
              {detail('Available credit (Trade Balance - Credit Limit)', formatNairaOrNA(selected.log.availableCredit))}
              {detail('Trade balance', formatNaira(selected.log.tradeBalance))}
              {detail('Available stock', formatNaira(selected.log.availableStock))}
              {detail('Cash in Till (CIT)', selected.log.legacy ? `${formatNaira(selected.log.cit)} (not recorded before CIT was introduced)` : formatNaira(selected.log.cit))}
              {detail('Total stock (Available Stock + CIT)', formatNaira(selected.log.totalStock))}
              {detail('TAR (Available Stock - Trade Balance)', <TarValue value={selected.log.tar} />)}
              {detail('Exposure (TAR - Available Stock + CIT)', <TarValue value={selected.log.exposure} />)}
              {selected.log.legacy && detail('Old Total Exposure (before migration)', formatNaira(selected.log.legacy.totalExposure))}
              {detail('Log ID', selected.log.id)}
              {detail('RMA', selected.rma)}
              {detail('BM', selected.bm)}
            </dl>
            <div>
              <p className="text-xs text-slate-500">RMA comments</p>
              <p className="mt-0.5 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                {selected.log.comments?.trim() ? selected.log.comments : 'No comments were added to this report.'}
              </p>
            </div>
            {selected.amendment && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="font-medium">Latest edit request: {selected.amendment.status}</p>
                <p className="mt-1">Reason: {selected.amendment.reason}</p>
                {selected.amendment.decisionComment && <p className="mt-1">Risk comment: {selected.amendment.decisionComment}</p>}
              </div>
            )}
            {selectedHistory.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Amendment history</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  {selectedHistory.map((h) => (
                    <li key={h.id} className="rounded-lg border border-slate-200 p-3">
                      <p>
                        Trade balance {formatNaira(h.originalTradeBalance)} to {formatNaira(h.updatedTradeBalance)}; available stock {formatNaira(h.originalAvailableStock)} to {formatNaira(h.updatedAvailableStock)}; CIT {formatNaira(h.originalCit)} to {formatNaira(h.updatedCit)}.
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-1">
                        TAR <TarValue value={h.originalTar} /> to <TarValue value={h.updatedTar} />; Exposure <TarValue value={h.originalExposure} /> to <TarValue value={h.updatedExposure} />. Approved {formatDate(h.approvalDate.slice(0, 10))}, resubmitted {formatDate(h.resubmissionDate.slice(0, 10))}.
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <EditRequestModal row={editRow} onClose={() => setEditRow(null)} />
      <AmendReportModal row={amendRow} request={amendRow?.amendment?.status === 'Approved' ? amendRow.amendment : null} onClose={() => setAmendRow(null)} />
    </div>
  );
}
