import { NotificationsList } from '../../shared/NotificationsList';

export function ManagementNotificationsPage() {
  return (
    <div className="space-y-4">
      {/* <div>
        <h2 className="text-lg font-semibold text-slate-900">Notification centre</h2>
        <p className="text-sm text-slate-500">Positive T.A.R alerts, submission reminders, overdue reports and amendment activity.</p>
      </div> */}
      <NotificationsList />
    </div>
  );
}
