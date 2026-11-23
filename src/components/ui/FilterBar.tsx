import type { ReactNode } from 'react';

/** Horizontal toolbar: search + filters on one row (wrapping on small screens), vertically centred. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
