import { Send } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useAmendments } from '../../hooks/useAmendments';
import { stationCodeLabel } from '../../types/station';
import { formatWeek } from '../../utils/date';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import type { LogListRow } from './WeeklyLogsTable';

/** Edit does NOT unlock the report: it only raises a request for Risk to approve. */
export function EditRequestModal({ row, onClose }: { row: LogListRow | null; onClose: () => void }) {
  const { request } = useAmendments();
  const { notify } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setReason('');
    setError('');
  }, [row?.log.id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!row) return;
    if (!reason.trim()) {
      setError('Reason for edit is required.');
      return;
    }
    setSubmitting(true);
    try {
      await request(row.log.id, reason);
      notify('success', 'Your amendment request has been submitted and is pending Risk approval.');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={row !== null} title="Request an edit" onClose={onClose}>
      {row && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="text-sm text-slate-600">
            {row.station.stationName} ({stationCodeLabel(row.station)}). The report stays locked until Risk approves your request.
          </p>
          <Input label="Reporting Week / Week Ending" value={formatWeek(row.log.reportingWeek)} readOnly />
          <div>
            <label htmlFor="edit-reason" className="mb-1.5 block text-sm font-medium text-slate-700">
              Reason for Edit<span className="text-rose-600"> *</span>
            </label>
            <textarea
              id="edit-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={Boolean(error)}
              className={`block w-full rounded-lg border bg-white px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 ${error ? 'border-rose-400' : 'border-slate-300'}`}
              placeholder="Explain what needs to be corrected and why"
            />
            {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} icon={<Send className="h-4 w-4" />}>
              Submit Edit Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
