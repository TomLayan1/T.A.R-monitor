import { Lock } from 'lucide-react';
import { stationCodeLabel, type Station } from '../../types/station';
import { formatNairaOrNA } from '../../utils/currency';

export function WeeklyLogSummary({ station }: { station: Station }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{station.stationName}</h2>
          <p className="text-sm text-slate-500">Station code: {stationCodeLabel(station)}</p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs text-slate-500">Credit limit</p>
          <p className="text-lg font-semibold text-slate-900">{formatNairaOrNA(station.creditLimit)}</p>
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" aria-hidden />
        Station code, name and credit limit come from S4HANA (simulated by JSON in this MVP) and cannot be edited.
      </p>
    </section>
  );
}
