import { Save } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAmendments } from '../../hooks/useAmendments';
import type { AmendmentRequest } from '../../types/amendment';
import { stationCodeLabel } from '../../types/station';
import { calculateWeeklyFigures } from '../../utils/calculations';
import { formatNaira, formatNairaOrNA, parseAmount } from '../../utils/currency';
import { formatWeek } from '../../utils/date';
import { tarTextClass } from '../../utils/tar-colours';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import type { LogListRow } from './WeeklyLogsTable';

const check = (raw: string, label: string): string | undefined => {
  const p = parseAmount(raw);
  if (p.kind === 'empty') return `${label} is required.`;
  if (p.kind === 'invalid') return `${label} must be a valid number.`;
  if (p.value < 0) return `${label} cannot be negative.`;
  return undefined;
};

/** Shown only for an Approved request. Trade Balance, Available Stock and CIT are editable; Credit Limit stays as recorded. */
export function AmendReportModal({ row, request, onClose }: { row: LogListRow | null; request: AmendmentRequest | null; onClose: () => void }) {
  const { complete } = useAmendments();
  const { notify } = useToast();
  const [tradeBalance, setTradeBalance] = useState('');
  const [stock, setStock] = useState('');
  const [cit, setCit] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row) {
      setTradeBalance(String(row.log.tradeBalance));
      setStock(String(row.log.availableStock));
      setCit(String(row.log.cit));
      setShowErrors(false);
    }
  }, [row?.log.id]);

  const tb = parseAmount(tradeBalance);
  const s = parseAmount(stock);
  const c = parseAmount(cit);
  const errors = { tradeBalance: check(tradeBalance, 'Trade Balance'), stock: check(stock, 'Available Stock'), cit: check(cit, 'Cash in Till (CIT)') };
  const figures = useMemo(
    () =>
      row && tb.kind === 'ok' && s.kind === 'ok' && c.kind === 'ok'
        ? calculateWeeklyFigures({ creditLimit: row.log.creditLimit, tradeBalance: tb.value, availableStock: s.value, cit: c.value })
        : null,
    [row, tb, s, c],
  );
  const show = (v: number | null | undefined) => (v === null || v === undefined ? '' : formatNaira(v));

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setShowErrors(true);
    if (!request || errors.tradeBalance || errors.stock || errors.cit || tb.kind !== 'ok' || s.kind !== 'ok' || c.kind !== 'ok') return;
    setSubmitting(true);
    try {
      await complete(request.id, { tradeBalance: tb.value, availableStock: s.value, cit: c.value });
      notify('success', 'Corrected report resubmitted. The report is locked again and Risk has been notified.');
      onClose();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not resubmit the report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={row !== null && request !== null} title="Amend approved report" onClose={onClose}>
      {row && request && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="rounded-lg border border-brand/30 bg-brand-light p-3 text-sm text-brand-dark">
            Approved by Risk. You can change Trade Balance, Available Stock and Cash in Till (CIT). Credit Limit stays as recorded
            from S4HANA. The original figures are kept in the amendment history.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Reporting Week" value={formatWeek(row.log.reportingWeek)} readOnly />
            <Input label="Station Code" value={stationCodeLabel(row.station)} readOnly />
            <Input label="Station Name" value={row.station.stationName} readOnly />
            <Input label="Credit Limit" value={formatNairaOrNA(row.log.creditLimit)} readOnly />
            <Input label="Available Credit" value={formatNairaOrNA(row.log.availableCredit)} readOnly hint="Trade Balance - Credit Limit" />
            <Input label="Trade Balance" required inputMode="decimal" adornment="₦" value={tradeBalance} onChange={(ev) => setTradeBalance(ev.target.value)} error={showErrors ? errors.tradeBalance : undefined} />
            <Input label="Available Stock" required inputMode="decimal" adornment="₦" value={stock} onChange={(ev) => setStock(ev.target.value)} error={showErrors ? errors.stock : undefined} />
            <Input label="Cash in Till (CIT)" required inputMode="decimal" adornment="₦" value={cit} onChange={(ev) => setCit(ev.target.value)} error={showErrors ? errors.cit : undefined} />
            <Input label="Total Stock" value={show(figures?.totalStock)} readOnly hint="Available Stock + CIT" />
            <Input label="TAR" value={show(figures?.tar)} inputClassName={figures ? `font-medium ${tarTextClass(figures.tar)}` : ''} readOnly hint="Available Stock - Trade Balance" />
            <Input label="Exposure" value={show(figures?.exposure)} inputClassName={figures ? `font-medium ${tarTextClass(figures.exposure)}` : ''} readOnly hint="TAR - Available Stock + CIT" />
            <Input label="BM" value={row.bm} readOnly />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={<Save className="h-4 w-4" />}>
              Save and resubmit
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
