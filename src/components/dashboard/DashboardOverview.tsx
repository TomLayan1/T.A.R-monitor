import { Banknote, Building2, Fuel, Gauge, Loader2, Wallet, WalletCards } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStations } from '../../hooks/useStations';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import {
  buildSnapshots,
  buildTarChartData,
  buildUtilisation,
  summarise,
  topTarStations,
} from '../../utils/calculations';
import { formatNaira } from '../../utils/currency';
import { buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { CreditUtilisationChart } from './CreditUtilisationChart';
import { SummaryCard } from './SummaryCard';
import { TarDebtChart } from './TarDebtChart';
import { TopDebtStations } from './TopDebtStations';

export function DashboardOverview() {
  const { stations, loading: stationsLoading } = useStations();
  const { logs, loading: logsLoading } = useWeeklyLogs();

  const snapshots = useMemo(() => buildSnapshots(stations, logs), [stations, logs]);
  const summary = useMemo(() => summarise(snapshots), [snapshots]);
  const top = useMemo(() => topTarStations(snapshots, 4), [snapshots]);
  const chartData = useMemo(() => buildTarChartData(snapshots), [snapshots]);
  const utilisation = useMemo(() => buildUtilisation(snapshots), [snapshots]);

  if (stationsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading dashboard...
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={Building2}
          title="No stations assigned"
          description="There are no stations assigned to your account yet. Station assignments come from S4HANA in production; in this demo, sign in as rma@demo.com to see the sample stations."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Figures reflect the latest weekly log submitted for each assigned station.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="Number of Stations" value={String(summary.stationCount)} icon={Building2} hint="Assigned to you" />
        <SummaryCard label="Total Credit" value={formatNaira(summary.totalCredit)} icon={Wallet} hint="Sum of credit limits" />
        <SummaryCard
          label="Total Available Credit"
          value={formatNaira(summary.totalAvailableCredit)}
          icon={WalletCards}
          hint="Trade Balance - Credit Limit"
        />
        <SummaryCard label="Total Available Stock" value={formatNaira(summary.totalAvailableStock)} icon={Fuel} hint="Latest weekly logs" />
        <SummaryCard label="Total CIT" value={formatNaira(summary.totalCit)} icon={Banknote} hint="Cash in Till, latest weekly logs" />
        <SummaryCard label="Exposure" value={formatNaira(summary.totalExposure)} icon={Gauge} hint="TAR - Available Stock + CIT" />
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <EmptyState
            icon={Building2}
            title="No weekly logs submitted yet"
            description="Open a station and submit its weekly log to populate the charts."
            action={
              <Link to="/rma/stations" className={buttonClasses('primary')}>
                Go to Stations
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <TopDebtStations rows={top} />
            </div>
            <CreditUtilisationChart utilisation={utilisation} />
          </div>
          <TarDebtChart data={chartData} />
        </>
      )}
    </div>
  );
}
