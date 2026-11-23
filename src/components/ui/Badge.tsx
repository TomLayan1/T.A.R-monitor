import type { ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'slate' | 'rose';
const tones: Record<Tone, string> = {
  green: 'bg-brand-light text-brand-dark ring-brand/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
