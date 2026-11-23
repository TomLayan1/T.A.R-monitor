import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useStations } from '../../hooks/useStations';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import { StationSearch } from './StationSearch';
import { StationsTable } from './StationsTable';

const PAGE_SIZE = 10;

export function StationsPage() {
  const { stations, search, loading } = useStations();
  const { latestByStation } = useWeeklyLogs();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => setPage(1), [query]);

  const filtered = useMemo(() => search(query), [search, query]);
  const snapshots = useMemo(
    () => filtered.map((station) => ({ station, log: latestByStation.get(station.id) ?? null })),
    [filtered, latestByStation],
  );
  const visible = snapshots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading stations...
      </div>
    );
  }

  const noStations = stations.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Assigned stations</h2>
          <p className="text-sm text-slate-500">Select a station to submit its weekly log.</p>
        </div>
        <StationSearch value={query} onChange={setQuery} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <StationsTable
          rows={visible}
          page={page}
          pageSize={PAGE_SIZE}
          total={snapshots.length}
          onPageChange={setPage}
          emptyTitle={noStations ? 'No stations assigned' : 'No stations match your search'}
          emptyDescription={
            noStations
              ? 'There are no stations assigned to your account yet.'
              : 'Try a different station code or name.'
          }
        />
      </div>
    </div>
  );
}
