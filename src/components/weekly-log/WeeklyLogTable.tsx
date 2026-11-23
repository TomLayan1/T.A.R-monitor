import { Fragment } from 'react';
import { formatNaira } from '../../utils/currency';
import { formatWeek } from '../../utils/date';
import { TarValue } from '../shared/TarValue';
import { Badge } from '../ui/Badge';

export interface LogRowData {
  key: string;
  reportingWeek: string;
  badge: { label: string; tone: 'green' | 'amber' | 'slate' | 'rose' };
  stationCode: string;
  stationName: string;
  creditLimit: number | null;
  availableCredit: number | null;
  totalExposure: number | null;
  availableStock: number | null;
  tarDebt: number | null;
  rma: string;
  bm: string;
}

/** Exact column headers required by the specification. */
export const WEEKLY_LOG_COLUMNS = [
  'STATION CODE',
  'STATION NAME',
  'CREDIT LIMIT',
  'AVAILABLE CREDIT',
  'TOTAL EXPOSURE',
  'AVAILABLE STOCK',
  'TAR EXPOSURE/DEBT',
  'RMA',
  'BM',
] as const;

const amount = (value: number | null) => (value === null ? '—' : formatNaira(value));

/**
 * Nine-column table. Each entry is a row; the reporting week and status sit in a slim
 * row directly above it so the nine requested headers stay unchanged.
 */
export function WeeklyLogTable({ rows }: { rows: LogRowData[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {WEEKLY_LOG_COLUMNS.map((col, i) => (
              <th
                key={col}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold tracking-wide text-slate-500 ${
                  i >= 2 && i <= 6 ? 'text-right' : 'text-left'
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((r) => (
            <Fragment key={r.key}>
              <tr className="border-t border-slate-200 bg-slate-50/70">
                <td colSpan={9} className="px-4 py-1.5 text-xs text-slate-600">
                  <span className="mr-2 font-medium">Reporting week: {formatWeek(r.reportingWeek)}</span>
                  <Badge tone={r.badge.tone}>{r.badge.label}</Badge>
                </td>
              </tr>
              <tr>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{r.stationCode}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{r.stationName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{amount(r.creditLimit)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{amount(r.availableCredit)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{amount(r.totalExposure)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{amount(r.availableStock)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{r.tarDebt === null ? '—' : <TarValue value={r.tarDebt} />}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{r.rma}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{r.bm}</td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
