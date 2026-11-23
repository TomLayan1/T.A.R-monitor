import { ArrowLeft, Building2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStations } from '../../hooks/useStations';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import { fullName } from '../../types/user';
import { calculateAvailableCredit, calculateTarDebt } from '../../utils/calculations';
import { parseAmount } from '../../utils/currency';
import { getNow } from '../../services/clock.service';
import { currentWeekEnding } from '../../utils/date';
import { buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { WeeklyLogForm, type Preview } from './WeeklyLogForm';
import { WeeklyLogSummary } from './WeeklyLogSummary';

export function WeeklyLogPage() {
  const { stationId = '' } = useParams<{ stationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getStation, loading: stationsLoading } = useStations();
  const { findSubmission, amendmentFor, rmaName, bmName, loading: logsLoading } = useWeeklyLogs();

  const [reportingWeek, setReportingWeek] = useState<string>(() => currentWeekEnding(getNow()));
  const [exposure, setExposure] = useState('');
  const [stock, setStock] = useState('');
  const [comments, setComments] = useState('');

  const station = getStation(stationId);
  const existing = station ? findSubmission(station.id, reportingWeek) : undefined;
  const amendment = station ? amendmentFor(station.id, reportingWeek) : null;

  const preview: Preview = useMemo(() => {
    if (!station) return { availableCredit: null, tarDebt: null };
    if (existing) return { availableCredit: existing.availableCredit, tarDebt: existing.tarDebt };
    const e = parseAmount(exposure);
    const s = parseAmount(stock);
    return {
      availableCredit: e.kind === 'ok' ? calculateAvailableCredit(e.value, station.creditLimit) : null,
      tarDebt: e.kind === 'ok' && s.kind === 'ok' ? calculateTarDebt(s.value, e.value) : null,
    };
  }, [station, existing, exposure, stock]);

  if (stationsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading station...
      </div>
    );
  }

  if (!station || !user) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <EmptyState
          icon={Building2}
          title="Station not found"
          description="This station does not exist or is not assigned to you."
          action={
            <Link to="/rma/stations" className={buttonClasses('primary')}>
              Back to Stations
            </Link>
          }
        />
      </div>
    );
  }

  const myName = fullName(user);
  const myBm = bmName(station.bmId ?? user.bmId); // the station's BM, else the RMA's BM

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/rma/stations"
          aria-label="Back to Stations"
          className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold text-slate-900">Weekly Station Log</h2>
      </div>

      <WeeklyLogSummary station={station} />

      <WeeklyLogForm
        station={station}
        reportingWeek={reportingWeek}
        onWeekChange={(w) => {
          setReportingWeek(w);
          setExposure('');
          setStock('');
          setComments('');
        }}
        exposure={exposure}
        stock={stock}
        onExposureChange={setExposure}
        onStockChange={setStock}
        comments={comments}
        onCommentsChange={setComments}
        preview={preview}
        existing={existing}
        amendment={amendment}
        rmaName={myName}
        bmName={myBm}
        onCancel={() => navigate('/rma/stations')}
        onSubmitted={() => {
          setExposure('');
          setStock('');
          setComments('');
        }}
      />

      {/* <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Current entry</h3>
          <p className="text-xs text-slate-500">Updates live as you type.</p>
        </div>
        <WeeklyLogTable rows={[currentRow]} />
      </section>

      <WeeklyLogHistory rows={history} /> */}
    </div>
  );
}
