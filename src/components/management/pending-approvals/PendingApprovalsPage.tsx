import { CheckCircle2, Eye } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useAmendments } from '../../../hooks/useAmendments';
import { useSharedData } from '../../../hooks/useSharedData';
import type { AmendmentRequest } from '../../../types/amendment';
import { stationCodeLabel } from '../../../types/station';
import { formatNaira, formatNairaOrNA } from '../../../utils/currency';
import { formatDateTime, formatWeek } from '../../../utils/date';
import { TarValue } from '../../shared/TarValue';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { EmptyState } from '../../ui/EmptyState';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../ui/Toast';

const th = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500';
const tone = (s: AmendmentRequest['status']) => (s === 'Pending Approval' ? 'amber' : s === 'Rejected' ? 'rose' : 'green');

/** Risk only (route guard + service-level role check on approve/reject). */
export function PendingApprovalsPage() {
  const { all, pending, decide } = useAmendments();
  const { rmaNames, reports } = useSharedData();
  const { notify } = useToast();
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const list = [...(tab === 'pending' ? pending : all)].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const selected = all.find((a) => a.id === openId) ?? null;
  const originalReport = selected ? reports.find((r) => r.id === selected.reportId) : undefined;

  const close = () => {
    setOpenId(null);
    setComment('');
  };

  const act = async (decision: 'Approved' | 'Rejected') => {
    if (!selected) return;
    setBusy(true);
    try {
      await decide(selected.id, decision, comment);
      notify('success', decision === 'Approved' ? 'Request approved. The RMA has been notified and the report is unlocked.' : 'Request rejected. The RMA has been notified.');
      close();
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Could not record the decision.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label: string, value: ReactNode) => (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Amendment requests</h2>
          <p className="text-sm text-slate-500">Only Risk users can approve or reject edits to submitted reports.</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
          {(['pending', 'all'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${tab === t ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {t === 'pending' ? `Pending (${pending.length})` : 'All requests'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {list.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No requests" description={tab === 'pending' ? 'There are no amendment requests awaiting approval.' : 'No amendment requests have been raised yet.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1400px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Request ID</th>
                  <th className={th}>RMA Name</th>
                  <th className={th}>Station Code</th>
                  <th className={th}>Station Name</th>
                  <th className={th}>Reporting Week</th>
                  <th className={th}>Trade Balance</th>
                  <th className={th}>Original Available Stock</th>
                  <th className={th}>Original CIT</th>
                  <th className={th}>Reason for Edit</th>
                  <th className={th}>Request Date</th>
                  <th className={th}>Status</th>
                  <th className={th}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {list.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{a.id}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{rmaNames[a.rmaId] ?? a.rmaId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-900">{stationCodeLabel(a)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{a.stationName}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatWeek(a.reportingWeek)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatNaira(a.originalTradeBalance)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatNaira(a.originalAvailableStock)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatNaira(a.originalCit)}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-sm text-slate-700" title={a.reason}>{a.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDateTime(a.requestedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm"><Badge tone={tone(a.status)}>{a.status}</Badge></td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Button size="sm" variant="secondary" icon={<Eye className="h-4 w-4" />} onClick={() => setOpenId(a.id)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={selected !== null} title="Amendment request" onClose={close}>
        {selected && (
          <div className="space-y-4">
            <Badge tone={tone(selected.status)}>{selected.status}</Badge>
            <dl className="grid gap-4 sm:grid-cols-2">
              {field('Request ID', selected.id)}
              {field('Requested by', rmaNames[selected.rmaId] ?? selected.rmaId)}
              {field('Station', `${selected.stationName} (${stationCodeLabel(selected)})`)}
              {field('Reporting week', formatWeek(selected.reportingWeek))}
              {field('Original trade balance', formatNaira(selected.originalTradeBalance))}
              {field('Original available stock', formatNaira(selected.originalAvailableStock))}
              {field('Original CIT', formatNaira(selected.originalCit))}
              {originalReport && field('Original available credit', formatNairaOrNA(originalReport.availableCredit))}
              {originalReport && field('Original TAR', <TarValue value={originalReport.tar} />)}
              {originalReport && field('Original exposure', <TarValue value={originalReport.exposure} />)}
              {field('Requested', formatDateTime(selected.requestedAt))}
              {selected.decidedAt && field('Decided', formatDateTime(selected.decidedAt))}
            </dl>
            <div>
              <p className="text-xs text-slate-500">Reason for edit</p>
              <p className="mt-0.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">{selected.reason}</p>
            </div>
            {selected.decisionComment && (
              <div>
                <p className="text-xs text-slate-500">Risk comment</p>
                <p className="mt-0.5 text-sm text-slate-800">{selected.decisionComment}</p>
              </div>
            )}
            {selected.status === 'Pending Approval' && (
              <>
                <div>
                  <label htmlFor="decision-comment" className="mb-1.5 block text-sm font-medium text-slate-700">Comment (optional)</label>
                  <textarea
                    id="decision-comment"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button variant="danger" onClick={() => act('Rejected')} disabled={busy}>
                    Reject Request
                  </Button>
                  <Button onClick={() => act('Approved')} loading={busy}>
                    Approve Request
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
