import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TarChartDatum } from '../../utils/calculations';
import { formatNaira, formatNairaCompact } from '../../utils/currency';
import { tarHex, tarTextClass } from '../../utils/tar-colours';

interface TipProps {
  active?: boolean;
  payload?: Array<{ payload: TarChartDatum }>;
}

function TarTooltip({ active, payload }: TipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-slate-900">{d.stationName}</p>
      <p className="text-xs text-slate-500">{d.stationCode}</p>
      <p className={`mt-1 font-medium ${tarTextClass(d.tar)}`}>{formatNaira(d.tar)}</p>
    </div>
  );
}

export function TarDebtChart({ data }: { data: TarChartDatum[] }) {
  const height = Math.max(240, data.length * 38 + 70);
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Station TAR Overview</h2>
      <p className="mt-0.5 text-xs text-slate-500">
        TAR = Available Stock - Trade Balance. Red: positive (debt). Green: negative. Grey: exactly ₦0.
      </p>
      <div className="mt-4 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, bottom: 25, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis
              type="number"
              tickFormatter={formatNairaCompact}
              tick={{ fontSize: 12, fill: '#475569' }}
              label={{ value: 'TAR (₦)', position: 'insideBottom', offset: -15, fontSize: 12, fill: '#475569' }}
            />
            <YAxis
              type="category"
              dataKey="stationCode"
              width={72}
              tick={{ fontSize: 12, fill: '#475569' }}
              label={{ value: 'Station', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#475569' }}
            />
            <Tooltip content={<TarTooltip />} cursor={{ fill: '#f1f5f9' }} />
            <ReferenceLine x={0} stroke="#94a3b8" />
            <Bar dataKey="tar" radius={[0, 4, 4, 0]} maxBarSize={26}>
              {data.map((d) => (
                <Cell key={d.stationCode} fill={tarHex(d.tar)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
