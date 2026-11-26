import { Download, Landmark, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScopedData } from '../../hooks/useScopedData';
import { exportFinancialMonitorWorkbook } from '../../services/excel.service';
import { buildFinancialMonitorRows } from '../../services/monthly-log.service';
import { stationCodeLabel } from '../../types/station';
import { formatNaira } from '../../utils/currency';
import { formatMonth } from '../../utils/date';
import { netEffectLevel, type NetEffectLevel } from '../../utils/net-effect';
import { hasOrgWideAccess } from '../../utils/permissions';
// import { Badge } from '../ui/Badge';
import { Button, buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { FilterBar } from '../ui/FilterBar';
import { FilterSelect } from '../ui/FilterSelect';
import { Pagination } from '../ui/Pagination';
import { SearchInput } from '../ui/SearchInput';
import { useToast } from '../ui/Toast';
import { NetEffectValue } from './NetEffectValue';

const PAGE_SIZE = 10;
const th = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';
const HEADERS = [
  'Station Code',
  'Station Name',
  'Opening Stock',
  'Opening Balance',
  'Total Opening Stock',
  'Closing Stock',
  'Closing Balance',
  'Total Closing Stock',
  'Change in Balance',
  'Change in Stock',
  'Net Effect',
];

type NetFilter = 'all' | NetEffectLevel | 'missing';
type Sort = 'code' | 'net-desc' | 'net-asc';

/**
 * Financial Monitor (RMA and Stakeholder portals). Every figure is calculated from the Account Monitoring monthly
 * logs in the user's scope; there is no separate editable dataset. Default view: each station's latest monthly log.
 */
export function FinancialMonitorPage() {
  const { user, stations, monthlyLogs } = useScopedData();
  const { notify } = useToast();
  const isRma = user?.role === 'RMA';
  const [month, setMonth] = useState<string>('latest');
  const [query, setQuery] = useState('');
  const [netFilter, setNetFilter] = useState<NetFilter>('all');
  const [sort, setSort] = useState<Sort>('code');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const months = useMemo(() => Array.from(new Set(monthlyLogs.map((l) => l.reportingMonth))).sort().reverse(), [monthlyLogs]);
  const rows = useMemo(() => buildFinancialMonitorRows(stations, monthlyLogs, month), [stations, monthlyLogs, month]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !(r.station.stationCode ?? '').toLowerCase().includes(q) && !r.station.stationName.toLowerCase().includes(q)) return false;
      if (netFilter === 'missing') return r.figures === null;
      if (netFilter !== 'all') return r.figures !== null && netEffectLevel(r.figures.netEffect) === netFilter;
      return true;
    });
    const net = (r: (typeof list)[number], missing: number) => r.figures?.netEffect ?? missing;
    if (sort === 'net-desc') return [...list].sort((a, b) => net(b, -Infinity) - net(a, -Infinity));
    if (sort === 'net-asc') return [...list].sort((a, b) => net(a, Infinity) - net(b, Infinity));
    return [...list].sort((a, b) => (a.station.stationCode || '~').localeCompare(b.station.stationCode || '~') || a.station.stationName.localeCompare(b.station.stationName));
  }, [rows, query, netFilter, sort]);

  useEffect(() => setPage(1), [month, query, netFilter, sort]);
  const pageRows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const logged = rows.filter((r) => r.figures !== null).map((r) => r.figures!);
  // const counts = {
  //   positive: logged.filter((f) => f.netEffect > 0).length,
  //   negative: logged.filter((f) => f.netEffect < 0).length,
  //   zero: logged.filter((f) => f.netEffect === 0).length,
  //   missing: rows.length - logged.length,
  // };
  const scopeText = user && hasOrgWideAccess(user.role) ? 'every station' : user?.role === 'BM' ? 'your assigned stations' : 'your assigned stations';

  const handleExport = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const filename = await exportFinancialMonitorWorkbook(user.id, month);
      notify('success', `Downloaded ${filename}.`);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not generate the report.');
    } finally {
      setBusy(false);
    }
  };

  if (stations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState icon={Landmark} title="No stations in your scope" description="The Financial Monitor shows monthly account monitoring for the stations you can access." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm text-slate-500">
          Monthly account monitoring for {scopeText}, calculated from the monthly logs.
        </p>
        <Button onClick={handleExport} loading={busy} disabled={logged.length === 0} icon={<Download className="h-4 w-4" />}>
          Download Excel
        </Button>
      </div>

      {/* <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Net Effect:</span>
        <Badge tone="rose">{counts.positive} positive</Badge>
        <Badge tone="green">{counts.negative} negative</Badge>
        <Badge tone="slate">{counts.zero} zero</Badge>
        {counts.missing > 0 && <Badge tone="amber">{counts.missing} without a monthly log</Badge>}
      </div> */}

      <FilterBar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search by station code or name" ariaLabel="Search Financial Monitor" className="w-full sm:min-w-[16rem] sm:flex-1" />
        <FilterSelect value={month} onChange={setMonth} ariaLabel="Reporting month">
          <option value="latest">Latest monthly log</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonth(m)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={netFilter} onChange={(v) => setNetFilter(v as NetFilter)} ariaLabel="Filter by Net Effect">
          <option value="all">All Net Effects</option>
          <option value="positive">Positive movement</option>
          <option value="negative">Negative movement</option>
          <option value="zero">No net movement</option>
          <option value="missing">No monthly log</option>
        </FilterSelect>
        <FilterSelect value={sort} onChange={(v) => setSort(v as Sort)} ariaLabel="Sort">
          <option value="code">Sort: Station code</option>
          <option value="net-desc">Sort: Net Effect high to low</option>
          <option value="net-asc">Sort: Net Effect low to high</option>
        </FilterSelect>
      </FilterBar>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {monthlyLogs.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No monthly logs yet"
            description={isRma ? 'Open a station and choose the Monthly Log tab to submit its first monthly log.' : 'Monthly logs appear here once RMAs submit them.'}
            action={isRma ? <Link to="/rma/stations" className={buttonClasses('primary')}>Go to Stations</Link> : undefined}
          />
        ) : visible.length === 0 ? (
          <EmptyState icon={SearchX} title="No stations match your filters" description="Try clearing the search or a filter." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[1650px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {HEADERS.map((h, i) => (
                    <th key={h} scope="col" className={`${th} ${i < 2 ? 'text-left' : 'text-right'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {pageRows.map(({ station, log, figures: f }) => (
                  <tr key={station.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(station)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                      {station.stationName}
                      <span className="block text-xs text-slate-400">{log ? formatMonth(log.reportingMonth) : 'No monthly log'}</span>
                    </td>
                    {f ? (
                      <>
                        {[f.openingStock, f.openingBalanceCit, f.totalOpeningStock, f.closingStock, f.closingBalanceCit, f.totalClosingStock, f.changeInBalance, f.changeInStock].map((v, i) => (
                          <td key={i} className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(v)}</td>
                        ))}
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm"><NetEffectValue value={f.netEffect} /></td>
                      </>
                    ) : (
                      <td colSpan={9} className="whitespace-nowrap px-4 py-3 text-left text-sm text-slate-400">
                        {month === 'latest' ? 'No monthly log submitted' : `No log for ${formatMonth(month)}`}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {monthlyLogs.length > 0 && visible.length > 0 && <Pagination page={page} pageSize={PAGE_SIZE} total={visible.length} onPageChange={setPage} />}
      </div>
    </div>
  );
}
