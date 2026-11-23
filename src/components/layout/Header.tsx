import { Menu } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { fullName, roleLabel } from '../../types/user';
import { Badge } from '../ui/Badge';

export function Header({ title, onMenuClick }: { title: string; onMenuClick: () => void }) {
  const { user } = useAuth();
  if (!user) return null;

  const initials = `${user.firstName[0] ?? ''}${user.surname[0] ?? ''}`.toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900 sm:text-xl">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Name and role sit in one horizontal row: display:flex; align-items:center; gap:12px */}
        <div className="hidden items-center gap-3 sm:flex">
          <p className="text-sm font-medium text-slate-900">{fullName(user)}</p>
          <Badge tone="green">{roleLabel(user.role)}</Badge>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white"
          aria-label={`Profile: ${fullName(user)}`}
        >
          {initials || 'U'}
        </div>
      </div>
    </header>
  );
}
