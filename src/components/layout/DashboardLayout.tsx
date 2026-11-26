import { Bell, Building2, ClipboardList, FileSpreadsheet, LayoutDashboard, Landmark } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import type { NavItem } from './Sidebar';
import { PortalLayout } from './PortalLayout';

function titleFor(pathname: string, firstName: string): string {
  if (pathname.startsWith('/rma/dashboard')) return `Welcome back, ${firstName}`;
  if (pathname.startsWith('/rma/weekly-logs')) return 'Weekly Logs';
  if (pathname.startsWith('/rma/notifications')) return 'Notifications';
  if (pathname.startsWith('/rma/reports')) return 'Reports';
  if (/^\/rma\/stations\/[^/]+\/weekly-log/.test(pathname)) return 'Station Log';
  if (pathname.startsWith('/rma/financial-monitor')) return 'Financial Monitor';
  if (pathname.startsWith('/rma/stations')) return 'Stations';
  return 'RMA Weekly Monitoring Portal';
}

/** RMA portal shell (the existing layout, with the Notifications item added). */
export function DashboardLayout() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const items: NavItem[] = useMemo(
    () => [
      { to: '/rma/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/rma/stations', label: 'Stations', icon: Building2 },
      { to: '/rma/weekly-logs', label: 'Weekly Logs', icon: ClipboardList },
      { to: '/rma/financial-monitor', label: 'Financial Monitor', icon: Landmark },
      { to: '/rma/reports', label: 'Reports', icon: FileSpreadsheet },
      { to: '/rma/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
    ],
    [unreadCount],
  );
  return <PortalLayout items={items} subtitle="Monitoring Portal" getTitle={(p) => titleFor(p, user?.firstName ?? '')} />;
}
