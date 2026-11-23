import { AlertTriangle, Building2, CheckCircle2, ClipboardX, Fuel, Gauge, Percent, Users, Wallet, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../../hooks/useNotifications';
import { useScopedData } from '../../../hooks/useScopedData';
import { useSubmissionStatus } from '../../../hooks/useSubmissionStatus';
import { stationSubmissionsForWeek } from '../../../services/submission.service';
import { buildSnapshots, buildTarChartData, buildUtilisation, summarise, topTarStations } from '../../../utils/calculations';
import { formatNaira } from '../../../utils/currency';
import { formatDateTime } from '../../../utils/date';
import { CreditUtilisationChart } from '../../dashboard/CreditUtilisationChart';
import { SummaryCard } from '../../dashboard/SummaryCard';
import { TarDebtChart } from '../../dashboard/TarDebtChart';
import { TopDebtStations } from '../../dashboard/TopDebtStations';
import { Badge } from '../../ui/Badge';
import { SubmissionPerformanceChart } from './SubmissionPerformanceChart';

const RECENT = new Set(['Positive T.A.R', 'Pending Submission', 'Overdue Reports', 'Amendment Request', 'Amendment Approved', 'Amendment Completed']);

/**
 * Stakeholder dashboard. Every figure is computed from the user's SCOPE (Head of Retail / Risk / Management:
 * all stations; Branch Manager: only assigned stations and RMAs) using each station's latest report.
 */
export function ManagementDashboard() {
  const { user, stations, rmas, currentReports, now } = useScopedData();
  const snapshots = useMemo(() => buildSnapshots(stations, currentReports), [stations, currentReports]);
  const { week, statuses } = useSubmissionStatus();
  const { notifications } = useNotifications();

  const summary = useMemo(() => summarise(snapshots), [snapshots]);
  const top = useMemo(() => topTarStations(snapshots, 10), [snapshots]);
  const chartData = useMemo(() => buildTarChartData(snapshots), [snapshots]);
  const utilisation = useMemo(() => buildUtilisation(snapshots), [snapshots]);
  const recent = useMemo(() => notifications.filter((n) => RECENT.has(n.category)).slice(0, 6), [notifications]);
  const submissions = useMemo(() => stationSubmissionsForWeek(stations, currentReports, week, now), [stations, currentReports, week, now]);
  const completed = submissions.filter((s) => s.state === 'Submitted').length;
  const outstanding = submissions.length - completed;
  const performance = submissions.length > 0 ? (completed / submissions.length) * 100 : 0;
  const outstandingLink = `/management/outstanding-stations?week=${week}`;
  const isBm = user?.role === 'BM';

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        {isBm ? 'Stations and RMAs assigned to you.' : 'All stations across every RMA.'} Figures use the latest submitted weekly report for each station.
      </p>

      {isBm ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Assigned Stations" value={String(summary.stationCount)} icon={Building2} />
          <SummaryCard label="Total Assigned RMAs" value={String(rmas.length)} icon={Users} />
          <SummaryCard label="Positive T.A.R Stations" value={String(summary.positiveTarStations)} icon={AlertTriangle} hint="Latest report, T.A.R above ₦0" />
          <SummaryCard label="Outstanding Reports" value={String(outstanding)} icon={ClipboardX} hint="Current reporting week" to={outstandingLink} />
          <SummaryCard label="Completed Reports" value={String(completed)} icon={CheckCircle2} hint="Current reporting week" />
          <SummaryCard label="Submission Performance" value={`${performance.toFixed(1)}%`} icon={Percent} hint="Completed / expected" />
          <SummaryCard label="Total Exposure" value={formatNaira(summary.totalExposure)} icon={Gauge} />
          <SummaryCard label="Available Stock" value={formatNaira(summary.totalAvailableStock)} icon={Fuel} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Number of Stations" value={String(summary.stationCount)} icon={Building2} />
          <SummaryCard label="Total Credit Limit" value={formatNaira(summary.totalCredit)} icon={Wallet} />
          <SummaryCard label="Total Available Credit" value={formatNaira(summary.totalAvailableCredit)} icon={WalletCards} hint="Total Exposure - Credit Limit" />
          <SummaryCard label="Total Exposure" value={formatNaira(summary.totalExposure)} icon={Gauge} />
          <SummaryCard label="Total Available Stock" value={formatNaira(summary.totalAvailableStock)} icon={Fuel} />
          <SummaryCard label="Positive T.A.R Stations" value={String(summary.positiveTarStations)} icon={AlertTriangle} hint="Latest report, T.A.R above ₦0" />
          <SummaryCard label="Outstanding Stations" value={String(outstanding)} icon={ClipboardX} hint="Click for details" to={outstandingLink} />
        </div>
      )}

      <TarDebtChart data={chartData} />

      <div className="grid gap-6 xl:grid-cols-2">
        <TopDebtStations rows={top} title="Top 10 Stations by T.A.R/Debt" showExposure />
        <SubmissionPerformanceChart statuses={statuses} week={week} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CreditUtilisationChart utilisation={utilisation} />
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent notifications</h2>
            <Link to="/management/notifications" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No recent alerts.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={`text-sm text-slate-900 ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</p>
                    <Badge tone={n.category === 'Positive T.A.R' || n.category === 'Overdue Reports' ? 'rose' : 'amber'}>{n.category}</Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-600">{n.description}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
