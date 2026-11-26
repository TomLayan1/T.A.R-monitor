import { Info, Lock, Send } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useMonthlyLogs } from '../../hooks/useMonthlyLogs';
import { useSharedData } from '../../hooks/useSharedData';
import { latestMonthlyLog, monthValidationError } from '../../services/monthly-log.service';
import type { Station } from '../../types/station';
import { calculateFinancialMonitor } from '../../utils/calculations';
import { formatNaira, parseAmount } from '../../utils/currency';
import { formatMonth, recentMonths } from '../../utils/date';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { useToast } from '../ui/Toast';

function validateAmount(raw: string, label: string): string | undefined {
  const parsed = parseAmount(raw);
  if (parsed.kind === 'empty') return `${label} is required.`;
  if (parsed.kind === 'invalid') return `${label} must be a valid number.`;
  if (parsed.value < 0) return `${label} cannot be negative.`;
  return undefined;
}

// const th = 'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500';

/**
 * Account Monitoring monthly log. The RMA enters only the closing values; the opening values are carried forward
 * from the station's most recent earlier monthly log (₦0 for the first log), shown read-only, and stored with the log.
 */
export function MonthlyLogForm({ station }: { station: Station }) {
  const { user } = useAuth();
  const { now } = useSharedData();
  const { monthlyLogs, openingFor, submit } = useMonthlyLogs();
  const { notify } = useToast();
  const isRma = user?.role === 'RMA';

  // const history = logsForStation(station.id);
  const latest = latestMonthlyLog(monthlyLogs, station.id);

  // Months that can still be logged: not in the future, not already logged, and after the latest existing log.
  const months = useMemo(
    () => recentMonths(now, 12).filter((m) => monthValidationError(monthlyLogs, station.id, m, now) === null),
    [now, monthlyLogs, station.id],
  );
  const [month, setMonth] = useState(months[0] ?? '');
  useEffect(() => {
    if (!months.includes(month)) setMonth(months[0] ?? '');
  }, [months, month]);

  const [closingStock, setClosingStock] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [comments, setComments] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const opening = month ? openingFor(station.id, month) : null;
  const errors = {
    closingStock: validateAmount(closingStock, 'Closing Stock'),
    closingBalance: validateAmount(closingBalance, 'Closing Balance'),
  };
  const cs = parseAmount(closingStock);
  const cb = parseAmount(closingBalance);
  // const preview =
  //   opening && cs.kind === 'ok' && cb.kind === 'ok'
  //     ? calculateFinancialMonitor({ openingStock: opening.openingStock, openingBalanceCit: opening.openingBalanceCit, closingStock: cs.value, closingBalanceCit: cb.value })
  //     : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !isRma || !month) return;
    setShowErrors(true);
    if (errors.closingStock || errors.closingBalance || cs.kind !== 'ok' || cb.kind !== 'ok') return;
    setSubmitting(true);
    try {
      await submit({ stationId: station.id, reportingMonth: month, closingStock: cs.value, closingBalanceCit: cb.value, comments });
      notify('success', `Monthly log submitted for ${station.stationName} (${formatMonth(month)}).`);
      setClosingStock('');
      setClosingBalance('');
      setComments('');
      setShowErrors(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not submit the monthly log.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} noValidate className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Monthly account monitoring</h3>
        <p className="mt-0.5 text-sm text-slate-500">Monthly station stock and cash balances. One log per station per month.</p>

        {!isRma && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>Only RMA accounts can submit monthly logs. You are viewing this station in read-only mode.</p>
          </div>
        )}

        {months.length === 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              {latest ? `The ${formatMonth(latest.reportingMonth)} log is the latest for this station.` : 'No months are available.'} The next month can be logged once it starts.
            </p>
          </div>
        ) : (
          <>
            {opening && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                <p>
                  {opening.source === 'first-log'
                    ? 'This is the first monthly log for this station, so the opening values start at ₦0.'
                    : `Opening values are carried forward from the ${formatMonth(opening.fromLog!.reportingMonth)} closing values and cannot be edited.`}
                  {opening.skippedMonths && ' Months in between have no log, so the most recent earlier log was used.'}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select label="Reporting month" value={month} onChange={(e) => setMonth(e.target.value)} hint="Current or earlier months that come after this station's latest log.">
                {months.map((m) => (
                  <option key={m} value={m}>
                    {formatMonth(m)}
                  </option>
                ))}
              </Select>
              <div className="hidden sm:block" />

              <Input label="Opening Stock" value={opening ? formatNaira(opening.openingStock) : ''} readOnly aria-readonly="true" hint="Previous month's Closing Stock (locked)" />
              <Input label="Closing Stock" required inputMode="decimal" adornment="₦" placeholder="0" value={closingStock} disabled={!isRma}
                onChange={(e) => setClosingStock(e.target.value)} onBlur={() => setShowErrors(true)} error={showErrors ? errors.closingStock : undefined} />
              <Input label="Opening Balance" value={opening ? formatNaira(opening.openingBalanceCit) : ''} readOnly aria-readonly="true" hint="Previous month's Closing Balance (locked)" />
              <Input label="Closing Balance" required inputMode="decimal" adornment="₦" placeholder="0" value={closingBalance} disabled={!isRma}
                onChange={(e) => setClosingBalance(e.target.value)} onBlur={() => setShowErrors(true)} error={showErrors ? errors.closingBalance : undefined} />
            </div>

            {/* <div className="mt-5 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 lg:grid-cols-5">
              {[
                ['Total Opening Stock', preview?.totalOpeningStock],
                ['Total Closing Stock', preview?.totalClosingStock],
                ['Change in Balance', preview?.changeInBalance],
                ['Change in Stock', preview?.changeInStock],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{value === undefined ? '—' : formatNaira(value as number)}</p>
                </div>
              ))}
              <div>
                <p className="text-xs text-slate-500">Net Effect</p>
                <p className="mt-1 text-sm">{preview ? <NetEffectValue value={preview.netEffect} /> : <span className="font-semibold text-slate-900">—</span>}</p>
              </div>
            </div> */}

            {/* <div className="mt-4">
              <label htmlFor="monthly-comments" className="mb-1.5 block text-sm font-medium text-slate-700">
                Comments <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea id="monthly-comments" rows={2} maxLength={1000} value={comments} disabled={!isRma} onChange={(e) => setComments(e.target.value)}
                placeholder="Explain stock write-offs, deliveries in transit or balance differences"
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-slate-100" />
            </div> */}

            <div className="mt-6 flex justify-end">
              <Button type="submit" loading={submitting} disabled={!isRma} icon={<Send className="h-4 w-4" />}>
                {submitting ? 'Submitting...' : 'Submit monthly log'}
              </Button>
            </div>
          </>
        )}
      </form>

      {/* <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">Monthly history</h3>
          <p className="text-xs text-slate-500">Submitted monthly logs for this station. Each month opens with the previous month's closing values.</p>
        </div>
        {history.length === 0 ? (
          <EmptyState icon={CalendarRange} title="No monthly logs yet" description="The first monthly log for this station opens at ₦0." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[1000px] divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={`${th} text-left`}>Reporting Month</th>
                  <th className={`${th} text-right`}>Opening Stock</th>
                  <th className={`${th} text-right`}>Closing Stock</th>
                  <th className={`${th} text-right`}>Opening Balance</th>
                  <th className={`${th} text-right`}>Closing Balance</th>
                  <th className={`${th} text-right`}>Net Effect</th>
                  <th className={`${th} text-left`}>Opening source</th>
                  <th className={`${th} text-left`}>Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {history.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{formatMonth(log.reportingMonth)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.openingStock)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.closingStock)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.openingBalanceCit)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-slate-700">{formatNaira(log.closingBalanceCit)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm"><NetEffectValue value={calculateFinancialMonitor(log).netEffect} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {log.openingSource === 'first-log' ? <Badge tone="slate">First log (₦0)</Badge> : <Badge tone="green">From {formatMonth(log.carriedFromMonth ?? '')}</Badge>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDateTime(log.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section> */}
    </div>
  );
}
