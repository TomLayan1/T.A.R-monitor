import { BarChart3 } from 'lucide-react';
import { stationCodeLabel } from '../../types/station';
import type { LoggedSnapshot } from '../../utils/calculations';
import { formatNaira } from '../../utils/currency';
import { tarHex } from '../../utils/tar-colours';
import { TarValue } from '../shared/TarValue';
import { EmptyState } from '../ui/EmptyState';

interface Props {
  rows: LoggedSnapshot[];
  title?: string;
  /** Management view also shows each station's exposure amount. */
  showExposure?: boolean;
}

export function TopDebtStations({ rows, title = 'Top 4 Stations by T.A.R/Debt', showExposure = false }: Props) {
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.log.tarDebt)), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <p className="mt-0.5 text-xs text-slate-500">Highest to lowest, from each station's latest weekly log.</p>

      {rows.length === 0 ? (
        <EmptyState icon={BarChart3} title="No weekly logs yet" description="Submit a weekly log to see the ranking." />
      ) : (
        <ol className="mt-4 space-y-4">
          {rows.map(({ station, log }, i) => (
            <li key={station.id}>
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {station.stationName} <span className="text-slate-500">({stationCodeLabel(station)})</span>
                    </p>
                    <TarValue value={log.tarDebt} className="shrink-0 text-sm font-semibold" />
                  </div>
                  {showExposure && (
                    <p className="text-xs text-slate-500">Total exposure: {formatNaira(log.totalExposure)}</p>
                  )}
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(Math.abs(log.tarDebt) / maxAbs) * 100}%`, backgroundColor: tarHex(log.tarDebt) }}
                    />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
