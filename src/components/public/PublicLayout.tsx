import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';
import { PublicNavbar } from './PublicNavbar';

/** Shell for the public website: sticky navbar, animated page transition, footer. Independent of the portal layouts. */
export function PublicLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col scroll-smooth bg-pub-forest font-display text-white">
      <PublicNavbar />
      <main key={pathname} className="pub-page-enter flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
