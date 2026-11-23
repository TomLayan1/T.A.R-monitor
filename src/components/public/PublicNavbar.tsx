import { ArrowRight, Fuel, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About', end: false },
];

function Logo() {
  return (
    <Link to="/" className="group flex items-center gap-3" aria-label="RMA Weekly Monitoring Portal - Home">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pub-yellow text-pub-forest shadow-lg shadow-pub-yellow/20 transition group-hover:rotate-6 group-hover:scale-105">
        <Fuel className="h-5 w-5" aria-hidden />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-sm font-bold tracking-tight text-white">RMA Weekly</span>
        <span className="block text-xs text-white/60">Monitoring Portal</span>
      </span>
    </Link>
  );
}

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative px-1 py-2 text-sm font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:rounded-full after:bg-pub-yellow after:transition-transform ${
      isActive ? 'text-white after:scale-x-100' : 'text-white/70 after:scale-x-0 hover:text-white hover:after:scale-x-100'
    }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-all duration-300 ${
        scrolled ? 'border-white/10 bg-pub-forest/80 backdrop-blur-xl' : 'border-transparent bg-pub-forest/0'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-10 md:flex" aria-label="Primary">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/sign-in"
            className="group hidden items-center gap-2 rounded-full bg-pub-yellow px-5 py-2.5 text-sm font-bold text-pub-forest shadow-lg shadow-pub-yellow/25 transition hover:-translate-y-0.5 hover:shadow-pub-yellow/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-pub-forest/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4" aria-label="Mobile">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-base font-medium ${isActive ? 'bg-white/10 text-pub-yellow' : 'text-white/80 hover:bg-white/5'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/sign-in" className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-pub-yellow px-5 py-3 text-base font-bold text-pub-forest">
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
