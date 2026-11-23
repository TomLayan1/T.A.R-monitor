import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  /** When set, the whole card is a link (e.g. Outstanding Stations opens its detail view). */
  to?: string;
}

export function SummaryCard({ label, value, hint, icon: Icon, to }: Props) {
  const body = (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${to ? 'transition hover:border-brand hover:shadow-md' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold text-slate-900" title={value}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className="rounded-lg bg-brand-light p-2.5 text-brand">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" aria-label={`${label}: ${value}. Open details`}>
      {body}
    </Link>
  ) : (
    body
  );
}
