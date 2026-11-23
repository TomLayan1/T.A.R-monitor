import { Fuel, LogOut, type LucideIcon } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SIGN_IN_PATH } from '../../routes/paths';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional count shown as a badge (e.g. unread notifications). */
  badge?: number;
}

interface ContentProps {
  items: NavItem[];
  subtitle: string;
  onNavigate?: () => void;
}

export function SidebarContent({ items, subtitle, onNavigate }: ContentProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onNavigate?.();
    navigate(SIGN_IN_PATH, { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-brand text-white">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="rounded-lg bg-white/15 p-2">
          <Fuel className="h-6 w-6" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">RMA Weekly</p>
          <p className="text-xs text-white/80">{subtitle}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Main navigation">
        {items.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white text-brand shadow-sm' : 'text-white/90 hover:bg-white/10'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" aria-hidden />
                <span className="flex-1">{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    className={`min-w-[1.4rem] rounded-full px-1.5 py-0.5 text-center text-xs font-semibold ${
                      isActive ? 'bg-brand text-white' : 'bg-white text-brand'
                    }`}
                    aria-label={`${badge} unread`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/20 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" aria-hidden />
          Logout
        </button>
      </div>
    </div>
  );
}

export function Sidebar({ items, subtitle }: { items: NavItem[]; subtitle: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
      <SidebarContent items={items} subtitle={subtitle} />
    </aside>
  );
}
