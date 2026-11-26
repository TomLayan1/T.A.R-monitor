import { ArrowLeft, Building2, CalendarRange, ClipboardList, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useStations } from '../../hooks/useStations';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import { creditLimitFor } from '../../services/report.service';
import { fullName } from '../../types/user';
import { calculateWeeklyFigures } from '../../utils/calculations';
import { parseAmount } from '../../utils/currency';
import { getNow } from '../../services/clock.service';
import { currentWeekEnding } from '../../utils/date';
import { buttonClasses } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { MonthlyLogForm } from './MonthlyLogForm';
import { WeeklyLogForm, type Preview } from './WeeklyLogForm';
import { WeeklyLogSummary } from './WeeklyLogSummary';

type Tab = 'weekly' | 'monthly';

/**
 * Station logging page (opened by "Create Log" on the Stations tab).
 * Station Name and Code at the top, then two tabs: Weekly Logs (default, TAR Monitor) and Monthly Log
 * (Account Monitoring). The selected tab is kept in the URL (?tab=monthly) so it survives refresh and back/forward.
 */
export function WeeklyLogPage() {
  const { stationId = '' } = useParams<{ stationId: string }>();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'monthly' ? 'monthly' : 'weekly';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getStation, loading: stationsLoading } = useStations();
  const { findSubmission, amendmentFor, bmName, loading: logsLoading } = useWeeklyLogs();

  const [reportingWeek, setReportingWeek] = useState<string>(() => currentWeekEnding(getNow()));
  const [tradeBalance, setTradeBalance] = useState('');
  const [stock, setStock] = useState('');
  const [cit, setCit] = useState('');
  const [comments, setComments] = useState('');

  const station = getStation(stationId);
  const existing = station ? findSubmission(station.id, reportingWeek) : undefined;
  const amendment = station ? amendmentFor(station.id, reportingWeek) : null;

  const preview: Preview | null = useMemo(() => {
    if (!station) return null;
    if (existing) return { ...existing };
    // Credit Limit comes from the S4HANA adapter; Trade Balance, Available Stock and CIT are typed by the RMA.
    const creditLimit = creditLimitFor(station);
    const tb = parseAmount(tradeBalance);
    const s = parseAmount(stock);
    const c = parseAmount(cit);
    if (tb.kind === 'ok' && s.kind === 'ok' && c.kind === 'ok') {
      return calculateWeeklyFigures({ creditLimit, tradeBalance: tb.value, availableStock: s.value, cit: c.value });
    }
    const tbValue = tb.kind === 'ok' ? tb.value : null;
    const sValue = s.kind === 'ok' ? s.value : null;
    const cValue = c.kind === 'ok' ? c.value : null;
    return {
      creditLimit,
      tradeBalance: tbValue,
      availableCredit: tbValue !== null && creditLimit !== null ? tbValue - creditLimit : null,
      totalStock: sValue !== null && cValue !== null ? sValue + cValue : null,
      tar: tbValue !== null && sValue !== null ? sValue - tbValue : null,
      exposure: null,
    };
  }, [station, existing, tradeBalance, stock, cit]);

  if (stationsLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading station...
      </div>
    );
  }

  if (!station || !user || !preview) {
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
  const tabs: Array<{ id: Tab; label: string; icon: typeof ClipboardList }> = [
    { id: 'weekly', label: 'Weekly Logs', icon: ClipboardList },
    { id: 'monthly', label: 'Monthly Log', icon: CalendarRange },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/rma/stations" aria-label="Back to Stations" className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-semibold text-slate-900">Station Log</h2>
      </div>

      <WeeklyLogSummary station={station} />

      <div role="tablist" aria-label="Station log type" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            onClick={() => setParams(id === 'weekly' ? {} : { tab: id }, { replace: true })}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === id ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'weekly' ? (
          <WeeklyLogForm
            station={station}
            reportingWeek={reportingWeek}
            onWeekChange={(w) => {
              setReportingWeek(w);
              setTradeBalance('');
              setStock('');
              setCit('');
              setComments('');
            }}
            tradeBalance={tradeBalance}
            stock={stock}
            cit={cit}
            onTradeBalanceChange={setTradeBalance}
            onStockChange={setStock}
            onCitChange={setCit}
            comments={comments}
            onCommentsChange={setComments}
            preview={preview}
            existing={existing}
            amendment={amendment}
            rmaName={myName}
            bmName={myBm}
            onCancel={() => navigate('/rma/stations')}
            onSubmitted={() => {
              setStock('');
              setCit('');
              setComments('');
            }}
          />
        ) : (
          <MonthlyLogForm station={station} />
        )}
      </div>
    </div>
  );
}
