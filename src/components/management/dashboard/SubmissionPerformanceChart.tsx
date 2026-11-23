import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { RmaSubmissionStatus } from '../../../types/submission';
import { formatWeek } from '../../../utils/date';
import { buttonClasses } from '../../ui/Button';

export function SubmissionPerformanceChart({ statuses, week }: { statuses: RmaSubmissionStatus[]; week: string }) {
  const submitted = statuses.filter((s) => s.status === 'Submitted').length;
  const yet = statuses.length - submitted;
  const overdue = statuses.filter((s) => s.status === 'Overdue').length;
  const data = [
    { name: 'Submitted', value: submitted, color: '#013C1C' },
    { name: 'Yet to submit', value: yet, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-900">RMA Weekly Submission Performance</h2>
      <p className="mt-0.5 text-xs text-slate-500">{formatWeek(week)}. Due Monday 11:59 PM WAT.</p>
      <div className="relative mt-2 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold text-slate-900">
            {submitted}/{statuses.length}
          </p>
          <p className="text-xs text-slate-500">RMAs submitted</p>
        </div>
      </div>
      <ul className="mt-2 space-y-1.5 text-sm">
        <li className="flex justify-between"><span className="text-slate-600">Submitted</span><span className="font-medium">{submitted}</span></li>
        <li className="flex justify-between"><span className="text-slate-600">Yet to submit</span><span className="font-medium">{yet}</span></li>
        <li className="flex justify-between"><span className="text-slate-600">Overdue</span><span className="font-medium">{overdue}</span></li>
      </ul>
      {yet > 0 && (
        <Link to={`/management/outstanding?week=${week}`} className={`${buttonClasses('secondary', 'sm')} mt-4 w-full`}>
          See who is outstanding
        </Link>
      )}
    </section>
  );
}
