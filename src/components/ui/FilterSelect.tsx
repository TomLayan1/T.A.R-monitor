import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

/** Compact filter dropdown with the same height, border, radius and typography as SearchInput. */
export function FilterSelect({ value, onChange, ariaLabel, children, className = '' }: Props) {
  return (
    <div className={`relative w-full sm:w-auto sm:min-w-[11rem] ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="block h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-3 pr-9 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
