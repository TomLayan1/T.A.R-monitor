import { Building2, CheckCircle2, ClipboardX, Fuel, Gauge, Landmark, Users, Wallet, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { useScopedData } from '../../../hooks/useScopedData';
import { useSubmissionStatus } from '../../../hooks/useSubmissionStatus';
import { stationSubmissionsForWeek } from '../../../services/submission.service';
import { buildSnapshots, buildTarChartData, buildUtilisation, summarise, topTarStations } from '../../../utils/calculations';
import { formatNaira } from '../../../utils/currency';
import { CreditUtilisationChart } from '../../dashboard/CreditUtilisationChart';
import { SummaryCard } from '../../dashboard/SummaryCard';
import { TarDebtChart } from '../../dashboard/TarDebtChart';
import { TopDebtStations } from '../../dashboard/TopDebtStations';
import { SubmissionPerformanceChart } from './SubmissionPerformanceChart';


/**
 * Stakeholder dashboard. Every figure is computed from the user's SCOPE (Head of Retail / Risk / Management:
 * all stations; Branch Manager: only assigned stations and RMAs) using each station's latest report.
 */
export function ManagementDashboard() {
  const { user, stations, rmas, currentReports, now } = useScopedData();
  const snapshots = useMemo(() => buildSnapshots(stations, currentReports), [stations, currentReports]);
  const { week, statuses } = useSubmissionStatus();

  const summary = useMemo(() => summarise(snapshots), [snapshots]);
  const top = useMemo(() => topTarStations(snapshots, 6), [snapshots]);
  const chartData = useMemo(() => buildTarChartData(snapshots), [snapshots]);
  const utilisation = useMemo(() => buildUtilisation(snapshots), [snapshots]);
  const submissions = useMemo(() => stationSubmissionsForWeek(stations, currentReports, week, now), [stations, currentReports, week, now]);
  const completed = submissions.filter((s) => s.state === 'Submitted').length;
  const outstanding = submissions.length - completed;
  // const performance = submissions.length > 0 ? (completed / submissions.length) * 100 : 0;
  const outstandingLink = `/management/outstanding-stations?week=${week}`;
  const isBm = user?.role === 'BM';

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        {isBm ? 'Stations and RMAs assigned to you.' : 'All stations across every RMA.'} Figures use the latest submitted weekly report for each station.
      </p>

      {isBm ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Total Assigned Stations" value={String(summary.stationCount)} icon={Building2} />
          <SummaryCard label="Total Assigned RMAs" value={String(rmas.length)} icon={Users} />
          {/* <SummaryCard label="Positive TAR Stations" value={String(summary.positiveTarStations)} icon={AlertTriangle} hint="" /> */}
          <SummaryCard label="Outstanding Reports" value={String(outstanding)} icon={ClipboardX} hint="" to={outstandingLink} />
          <SummaryCard label="Completed Reports" value={String(completed)} icon={CheckCircle2} hint="" />
          {/* <SummaryCard label="Submission Performance" value={`${performance.toFixed(1)}%`} icon={Percent} hint="" /> */}
          {/* <SummaryCard label="Total Trade Balance" value={formatNaira(summary.totalTradeBalance)} icon={Landmark} hint="" /> */}
          <SummaryCard label="Available Stock" value={formatNaira(summary.totalAvailableStock)} icon={Fuel} />
          <SummaryCard label="Exposure" value={formatNaira(summary.totalExposure)} icon={Gauge} hint="" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryCard label="Total Number of Stations" value={String(summary.stationCount)} icon={Building2} />
          <SummaryCard label="Total Credit Limit" value={formatNaira(summary.totalCredit)} icon={Wallet} />
          <SummaryCard label="Total Available Credit" value={formatNaira(summary.totalAvailableCredit)} icon={WalletCards} hint="" />
          <SummaryCard label="Total Trade Balance" value={formatNaira(summary.totalTradeBalance)} icon={Landmark} hint="" />
          <SummaryCard label="Total Available Stock" value={formatNaira(summary.totalAvailableStock)} icon={Fuel} />
          {/* <SummaryCard label="Total CIT" value={formatNaira(summary.totalCit)} icon={Banknote} hint="Cash in Till" /> */}
          {/* <SummaryCard label="Total TAR" value={formatNaira(summary.totalTar)} icon={AlertTriangle} hint="Available Stock - Trade Balance" /> */}
          <SummaryCard label="Exposure" value={formatNaira(summary.totalExposure)} icon={Gauge} hint="" />
          {/* <SummaryCard label="Outstanding Stations" value={String(outstanding)} icon={ClipboardX} hint="Click for details" to={outstandingLink} /> */}
        </div>
      )}

      <TopDebtStations rows={top} title="Top 6 Stations by TAR" showExposure />

      <TarDebtChart data={chartData} />

      <div className="grid gap-6 xl:grid-cols-2">
        <CreditUtilisationChart utilisation={utilisation} />
        <SubmissionPerformanceChart statuses={statuses} week={week} />
      </div>

      {/* <div className="grid gap-6 xl:grid-cols-2">
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
      </div> */}
    </div>
  );
}
