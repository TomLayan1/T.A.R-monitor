import { History } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { WeeklyLogTable, type LogRowData } from './WeeklyLogTable';

export function WeeklyLogHistory({ rows }: { rows: LogRowData[] }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-base font-semibold text-slate-900">Previous submissions</h3>
        <p className="text-xs text-slate-500">Submitted logs are read-only.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={History} title="No previous submissions" description="Earlier weekly logs for this station will appear here." />
      ) : (
        <WeeklyLogTable rows={rows} />
      )}
    </section>
  );
}
