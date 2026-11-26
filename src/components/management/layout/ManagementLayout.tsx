import { Bell, Building2, FileSpreadsheet, Landmark, LayoutDashboard, ShieldCheck, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useNotifications } from '../../../hooks/useNotifications';
import { canDecideAmendment } from '../../../utils/permissions';
import { PortalLayout } from '../../layout/PortalLayout';
import type { NavItem } from '../../layout/Sidebar';

const titles: Array<[string, string]> = [
  ['/management/dashboard', 'Dashboard'],
  ['/management/stations', 'Stations'],
  ['/management/financial-monitor', 'Financial Monitor'],
  ['/management/reports', 'Reports'],
  ['/management/notifications', 'Notifications'],
  ['/management/outstanding-stations', 'Outstanding Stations'],
  ['/management/outstanding', 'Outstanding Submissions'],
  ['/management/approvals', 'Pending Approvals'],
  ['/management/performance', 'R.M.A Performance'],
];
const titleFor = (pathname: string) => titles.find(([p]) => pathname.startsWith(p))?.[1] ?? 'Stakeholder Portal';

/** Stakeholder shell (BM, Head of Retail, Risk, Management). Pending Approvals appears for Risk users only. */
export function ManagementLayout() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const isRisk = user ? canDecideAmendment(user.role) : false;

  const items: NavItem[] = useMemo(
    () => [
      { to: '/management/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/management/stations', label: 'Stations', icon: Building2 },
      { to: '/management/financial-monitor', label: 'Financial Monitor', icon: Landmark },
      { to: '/management/reports', label: 'Reports', icon: FileSpreadsheet },
      { to: '/management/notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
      ...(isRisk ? [{ to: '/management/approvals', label: 'Pending Approvals', icon: ShieldCheck }] : []),
      { to: '/management/performance', label: 'R.M.A Performance', icon: TrendingUp },
    ],
    [unreadCount, isRisk],
  );
  return <PortalLayout items={items} subtitle={user?.role === 'BM' ? 'Branch Manager Portal' : 'Stakeholder Portal'} getTitle={titleFor} />;
}
