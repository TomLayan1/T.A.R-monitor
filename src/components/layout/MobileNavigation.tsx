import { X } from 'lucide-react';
import { useEffect } from 'react';
import { SidebarContent, type NavItem } from './Sidebar';

interface Props {
  open: boolean;
  onClose: () => void;
  items: NavItem[];
  subtitle: string;
}

export function MobileNavigation({ open, onClose, items, subtitle }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative h-full w-72 max-w-[85%]">
        <SidebarContent items={items} subtitle={subtitle} onNavigate={onClose} />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="absolute right-3 top-5 rounded-md p-1 text-white/90 hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
