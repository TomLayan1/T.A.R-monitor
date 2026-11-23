import { NotificationsList } from '../../shared/NotificationsList';

export function RmaNotificationsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-500">T.A.R alerts, edit-request decisions, reminders and nudges from management.</p>
      </div>
      <NotificationsList />
    </div>
  );
}
