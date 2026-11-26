import { Eye, Pencil } from 'lucide-react';
import type { AmendmentRequest } from '../../types/amendment';
import { stationCodeLabel, type Station } from '../../types/station';
import type { WeeklyLog } from '../../types/weekly-log';
import { formatNaira, formatNairaOrNA } from '../../utils/currency';
import { formatWeek } from '../../utils/date';
import { TarValue } from '../shared/TarValue';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface LogListRow {
  log: WeeklyLog;
  station: Station;
  rma: string;
  bm: string;
  amendment: AmendmentRequest | null;
}

/** What the Status column shows: derived from the log and its amendment request. */
export function displayStatus(row: LogListRow): { label: string; tone: 'green' | 'amber' | 'slate' | 'rose' } {
  if (row.amendment?.status === 'Pending Approval') return { label: 'Edit requested', tone: 'amber' };
  if (row.amendment?.status === 'Approved') return { label: 'Unlocked for edit', tone: 'amber' };
  if (row.log.version > 1) return { label: `Amended (v${row.log.version})`, tone: 'green' };
  return { label: row.log.status, tone: 'green' };
}

/** The 11 TAR Monitor columns in the required order, followed by the existing BM / Status / Action columns. */
const headers = [
  'Reporting Week',
  'Station Code',
  'Station Name',
  'Credit Limit',
  'Available Credit',
  'Trade Balance',
  'Available Stock',
  'CIT',
  'Total Stock',
  'TAR',
  'Exposure',
  'BM',
  'Status',
  'Action',
];
const numeric = new Set([3, 4, 5, 6, 7, 8, 9, 10]);

interface Props {
  rows: LogListRow[];
  onView: (row: LogListRow) => void;
  onEdit: (row: LogListRow) => void;
}

export function WeeklyLogsTable({ rows, onView, onEdit }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1750px] w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h, i) => (
              <th
                key={h}
                scope="col"
                className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
                  numeric.has(i) ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => {
            const { log, station } = row;
            const status = displayStatus(row);
            const pending = row.amendment?.status === 'Pending Approval';
            return (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatWeek(log.reportingWeek)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(station)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.stationName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNairaOrNA(log.creditLimit)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNairaOrNA(log.availableCredit)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.tradeBalance)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.availableStock)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
                  {formatNaira(log.cit)}
                  {log.legacy && <span className="block text-[11px] text-amber-600" title="Migrated from the old structure: CIT was not recorded">Not recorded</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.totalStock)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <TarValue value={log.tar} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                  <TarValue value={log.exposure} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{row.bm}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={<Eye className="h-4 w-4" />} onClick={() => onView(row)}>
                      View
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Pencil className="h-4 w-4" />}
                      onClick={() => onEdit(row)}
                      disabled={pending}
                      title={pending ? 'An edit request is awaiting approval' : undefined}
                    >
                      Edit
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
