import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Utilisation } from '../../utils/calculations';
import { formatNaira } from '../../utils/currency';

export function CreditUtilisationChart({ utilisation }: { utilisation: Utilisation }) {
  const segments = [
    { name: 'Used (within limit)', value: utilisation.withinLimit, color: '#013C1C' },
    { name: 'Unused credit limit', value: utilisation.unused, color: '#cbd5e1' },
    { name: 'Above limit', value: utilisation.aboveLimit, color: '#fb7185' },
  ].filter((s) => s.value > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">Credit Utilisation Overview</h2>
      <p className="mt-0.5 text-xs text-slate-500">Latest trade balance (S4HANA) as a share of total credit limits.</p>

      <div className="relative mt-2 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={segments} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {segments.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatNaira(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-slate-900">{utilisation.percent.toFixed(1)}%</p>
          <p className="text-xs text-slate-500">utilised</p>
        </div>
      </div>

      <ul className="mt-2 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
            <span className="font-medium text-slate-900">{formatNaira(s.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
