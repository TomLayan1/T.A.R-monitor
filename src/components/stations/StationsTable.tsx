import { ChevronLeft, ChevronRight, SearchX } from 'lucide-react';
import type { StationSnapshot } from '../../utils/calculations';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { StationTableRow } from './StationTableRow';

interface Props {
  rows: StationSnapshot[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function StationsTable({ rows, page, pageSize, total, onPageChange, emptyTitle, emptyDescription }: Props) {
  if (total === 0) {
    return <EmptyState icon={SearchX} title={emptyTitle} description={emptyDescription} />;
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Station Code</th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Station Name</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Available Credit</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Current Exposure</th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((snapshot) => (
              <StationTableRow key={snapshot.station.id} snapshot={snapshot} />
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing {from}-{to} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} icon={<ChevronLeft className="h-4 w-4" />}>
              Previous
            </Button>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
