import { Info, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useSharedData } from '../../hooks/useSharedData';
import { useWeeklyLogs } from '../../hooks/useWeeklyLogs';
import type { AmendmentRequest } from '../../types/amendment';
import { stationCodeLabel, stationRef, type Station } from '../../types/station';
import type { WeeklyLog } from '../../types/weekly-log';
import { formatNaira, formatNairaOrNA, parseAmount } from '../../utils/currency';
import { deadlineFor, formatWeek, recentWeeks } from '../../utils/date';
import { tarTextClass } from '../../utils/tar-colours';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { useToast } from '../ui/Toast';

/** Live figures shown on the form. Credit Limit comes from S4HANA; calculated figures appear once their RMA inputs are valid. */
export interface Preview {
  creditLimit: number | null;
  tradeBalance: number | null;
  availableCredit: number | null;
  totalStock: number | null;
  tar: number | null;
  exposure: number | null;
}

interface Props {
  station: Station;
  reportingWeek: string;
  onWeekChange: (week: string) => void;
  tradeBalance: string;
  stock: string;
  cit: string;
  onTradeBalanceChange: (v: string) => void;
  onStockChange: (v: string) => void;
  onCitChange: (v: string) => void;
  comments: string;
  onCommentsChange: (v: string) => void;
  preview: Preview;
  existing: WeeklyLog | undefined;
  amendment: AmendmentRequest | null;
  rmaName: string;
  bmName: string;
  onCancel: () => void;
  onSubmitted: () => void;
}

function validateAmount(raw: string, label: string): string | undefined {
  const parsed = parseAmount(raw);
  if (parsed.kind === 'empty') return `${label} is required.`;
  if (parsed.kind === 'invalid') return `${label} must be a valid number.`;
  if (parsed.value < 0) return `${label} cannot be negative.`;
  return undefined;
}

const show = (value: number | null) => (value === null ? '' : formatNaira(value));

export function WeeklyLogForm(props: Props) {
  const { station, reportingWeek, tradeBalance, stock, cit, preview, existing, rmaName, bmName } = props;
  const { user } = useAuth();
  const { submitLog } = useWeeklyLogs();
  const { now } = useSharedData();
  const { notify } = useToast();
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isRma = user?.role === 'RMA';
  const locked = Boolean(existing) || !isRma;

  const weeks = useMemo(() => {
    const list = recentWeeks(now, 8);
    return list.includes(reportingWeek) ? list : [reportingWeek, ...list];
  }, [reportingWeek, now]);
  const isLate = !existing && now.getTime() > deadlineFor(reportingWeek).getTime();

  const errors = {
    tradeBalance: validateAmount(tradeBalance, 'Trade Balance'),
    stock: validateAmount(stock, 'Available Stock'),
    cit: validateAmount(cit, 'Cash in Till (CIT)'),
  };
  const parsedTradeBalance = parseAmount(tradeBalance);
  const parsedStock = parseAmount(stock);
  const parsedCit = parseAmount(cit);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || locked) return;
    setShowErrors(true);
    if (errors.tradeBalance || errors.stock || errors.cit) return;
    if (parsedTradeBalance.kind !== 'ok' || parsedStock.kind !== 'ok' || parsedCit.kind !== 'ok') return;

    setSubmitting(true);
    try {
      await submitLog({
        stationId: station.id,
        reportingWeek,
        tradeBalance: parsedTradeBalance.value,
        availableStock: parsedStock.value,
        cit: parsedCit.value,
        comments: props.comments,
      });
      notify('success', `Weekly log submitted for ${station.stationName} (${formatWeek(reportingWeek)}).`);
      setShowErrors(false);
      props.onSubmitted();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not submit the weekly log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Weekly reporting form</h3>

      {existing && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            A log for {formatWeek(reportingWeek)} has already been submitted. Submitted logs are read-only; corrections
            will be handled by a future approval workflow.
          </p>
        </div>
      )}
      {existing && props.amendment?.status === 'Approved' && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Risk approved your edit request for this report.{' '}
            <Link to={`/rma/weekly-logs?q=${encodeURIComponent(stationRef(station))}`} className="font-semibold underline">
              Open Weekly Logs
            </Link>{' '}
            to update Trade Balance, Available Stock and Cash in Till (CIT).
          </p>
        </div>
      )}
      {existing && props.amendment?.status === 'Pending Approval' && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>An edit request for this report is awaiting Risk approval. The report stays locked until then.</p>
        </div>
      )}
      {isLate && isRma && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>The deadline for this week (Monday 11:59 PM WAT) has passed. A report submitted now will be recorded as late.</p>
        </div>
      )}
      {!isRma && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>Only RMA accounts can submit weekly logs. You are viewing this station in read-only mode.</p>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Reporting week"
          value={reportingWeek}
          onChange={(e) => props.onWeekChange(e.target.value)}
          hint="Week ending Sunday; due the following Monday, 11:59 PM WAT. One submission per station per week."
        >
          {weeks.map((w) => (
            <option key={w} value={w}>
              {formatWeek(w)}
            </option>
          ))}
        </Select>
        <Input label="Station Code" value={stationCodeLabel(station)} readOnly hint={station.stationCode === null ? 'Pending: supplied by S4HANA' : undefined} />
        <Input label="Station Name" value={station.stationName} readOnly />
        <Input label="Credit Limit" value={formatNairaOrNA(preview.creditLimit)} readOnly hint={preview.creditLimit === null ? 'Pending: supplied by S4HANA. Available Credit cannot be calculated yet.' : 'S4HANA (simulated)'} />
        <Input label="Available Credit" value={show(preview.availableCredit)} placeholder={preview.creditLimit === null ? 'Not available' : 'Calculated'} readOnly hint="Trade Balance - Credit Limit" />
        <Input
          label="Trade Balance"
          required
          inputMode="decimal"
          adornment="₦"
          placeholder="0"
          value={existing ? String(existing.tradeBalance) : tradeBalance}
          disabled={locked}
          onChange={(e) => props.onTradeBalanceChange(e.target.value)}
          onBlur={() => setShowErrors(true)}
          error={showErrors && !locked ? errors.tradeBalance : undefined}
        />

        <Input
          label="Available Stock"
          required
          inputMode="decimal"
          adornment="₦"
          placeholder="0"
          value={existing ? String(existing.availableStock) : stock}
          disabled={locked}
          onChange={(e) => props.onStockChange(e.target.value)}
          onBlur={() => setShowErrors(true)}
          error={showErrors && !locked ? errors.stock : undefined}
        />
        <Input
          label="Cash in Till (CIT)"
          required
          inputMode="decimal"
          adornment="₦"
          placeholder="0"
          value={existing ? String(existing.cit) : cit}
          disabled={locked}
          onChange={(e) => props.onCitChange(e.target.value)}
          onBlur={() => setShowErrors(true)}
          error={showErrors && !locked ? errors.cit : undefined}
          hint={showErrors && !locked && errors.cit ? undefined : 'Cash physically at the station that has not yet been deposited.'}
        />
        <Input label="Total Stock" value={show(preview.totalStock)} placeholder="Calculated" readOnly hint="Available Stock + CIT" />

        <Input
          label="TAR"
          value={show(preview.tar)}
          inputClassName={preview.tar === null ? '' : `font-medium ${tarTextClass(preview.tar)}`}
          placeholder="Calculated"
          readOnly
          hint="Available Stock - Trade Balance"
        />
        <Input
          label="Exposure"
          value={show(preview.exposure)}
          inputClassName={preview.exposure === null ? '' : `font-medium ${tarTextClass(preview.exposure)}`}
          placeholder="Calculated"
          readOnly
          hint="TAR - Available Stock + CIT"
        />
        <div className="hidden lg:block" />

        <Input label="RMA" value={rmaName} readOnly />
        <Input label="BM" value={bmName} readOnly />

        <div className="sm:col-span-2 lg:col-span-3">
          <label htmlFor="log-comments" className="mb-1.5 block text-sm font-medium text-slate-700">
            Comments <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="log-comments"
            rows={3}
            maxLength={1000}
            value={existing ? existing.comments ?? '' : props.comments}
            onChange={(e) => props.onCommentsChange(e.target.value)}
            disabled={locked}
            placeholder="Explain unusual positions, debt, discrepancies or anything management should know"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={props.onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={locked} icon={<Send className="h-4 w-4" />}>
          {submitting ? 'Submitting...' : 'Submit weekly log'}
        </Button>
      </div>
    </form>
  );
}
