import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { MobileNavigation } from './MobileNavigation';
import { Sidebar, type NavItem } from './Sidebar';

interface Props {
  items: NavItem[];
  subtitle: string;
  getTitle: (pathname: string) => string;
}

/** Shared shell used by both portals: sidebar, mobile drawer, header and routed content. */
export function PortalLayout({ items, subtitle, getTitle }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar items={items} subtitle={subtitle} />
      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} items={items} subtitle={subtitle} />
      <div className="lg:pl-64">
        <Header title={getTitle(pathname)} onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
