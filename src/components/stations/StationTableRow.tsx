import { ClipboardEdit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { stationCodeLabel } from '../../types/station';
import type { StationSnapshot } from '../../utils/calculations';
import { formatNaira, formatNairaOrNA } from '../../utils/currency';
import { buttonClasses } from '../ui/Button';
import { TarValue } from '../shared/TarValue';

export function StationTableRow({ snapshot }: { snapshot: StationSnapshot }) {
  const { station, log } = snapshot;
  return (
    <tr className="hover:bg-slate-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(station)}</td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{station.stationName}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
        {log ? formatNairaOrNA(log.availableCredit, '—') : '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">
        {log ? formatNaira(log.tradeBalance) : '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{log ? <TarValue value={log.tar} /> : '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm">{log ? <TarValue value={log.exposure} /> : '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <Link
          to={`/rma/stations/${station.id}/weekly-log`}
          className={buttonClasses('primary', 'sm')}
          aria-label={`Create log for ${station.stationName}`}
        >
          <ClipboardEdit className="h-4 w-4" aria-hidden />
          Create Log
        </Link>
      </td>
    </tr>
  );
}
