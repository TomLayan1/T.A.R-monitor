import { Save } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAmendments } from '../../hooks/useAmendments';
import type { AmendmentRequest } from '../../types/amendment';
import { stationCodeLabel } from '../../types/station';
import { calculateAvailableCredit, calculateTarDebt } from '../../utils/calculations';
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

/** Shown only for an Approved request. Only Total Exposure and Available Stock are editable. */
export function AmendReportModal({ row, request, onClose }: { row: LogListRow | null; request: AmendmentRequest | null; onClose: () => void }) {
  const { complete } = useAmendments();
  const { notify } = useToast();
  const [exposure, setExposure] = useState('');
  const [stock, setStock] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (row) {
      setExposure(String(row.log.totalExposure));
      setStock(String(row.log.availableStock));
      setShowErrors(false);
    }
  }, [row?.log.id]);

  const e = parseAmount(exposure);
  const s = parseAmount(stock);
  const errors = { exposure: check(exposure, 'Total Exposure'), stock: check(stock, 'Available Stock') };
  const availableCredit = useMemo(
    () => (row && e.kind === 'ok' ? calculateAvailableCredit(e.value, row.station.creditLimit) : null),
    [row, e],
  );
  const tar = e.kind === 'ok' && s.kind === 'ok' ? calculateTarDebt(s.value, e.value) : null;

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    setShowErrors(true);
    if (!request || errors.exposure || errors.stock || e.kind !== 'ok' || s.kind !== 'ok') return;
    setSubmitting(true);
    try {
      await complete(request.id, e.value, s.value);
      notify('success', 'Corrected report resubmitted. The report is locked again and management has been notified.');
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
            Approved by the Head of Retail. You can change Total Exposure and Available Stock only; the other fields are locked.
            The original figures are kept in the amendment history.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Reporting Week" value={formatWeek(row.log.reportingWeek)} readOnly />
            <Input label="Station Code" value={stationCodeLabel(row.station)} readOnly />
            <Input label="Station Name" value={row.station.stationName} readOnly />
            <Input label="Credit Limit" value={formatNairaOrNA(row.station.creditLimit)} readOnly />
            <Input
              label="Total Exposure"
              required
              inputMode="decimal"
              adornment="₦"
              value={exposure}
              onChange={(ev) => setExposure(ev.target.value)}
              error={showErrors ? errors.exposure : undefined}
            />
            <Input
              label="Available Stock"
              required
              inputMode="decimal"
              adornment="₦"
              value={stock}
              onChange={(ev) => setStock(ev.target.value)}
              error={showErrors ? errors.stock : undefined}
            />
            <Input label="Available Credit" value={availableCredit === null ? '' : formatNaira(availableCredit)} readOnly hint="Total Exposure - Credit Limit" />
            <Input
              label="T.A.R Exposure/Debt"
              value={tar === null ? '' : formatNaira(tar)}
              inputClassName={tar === null ? '' : `font-medium ${tarTextClass(tar)}`}
              readOnly
              hint="Available Stock - Total Exposure"
            />
            <Input label="RMA" value={row.rma} readOnly />
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
