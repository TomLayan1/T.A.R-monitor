import { Fuel } from 'lucide-react';
import { Link } from 'react-router-dom';

const columns: Array<{ title: string; links: Array<{ label: string; to: string }> }> = [
  {
    title: 'Navigation',
    links: [
      { label: 'Home', to: '/' },
      { label: 'About', to: '/about' },
      { label: 'Get Started', to: '/sign-in' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Sign In', to: '/sign-in' },
      { label: 'Create an Account', to: '/sign-up' },
      { label: 'Onboard a Station', to: '/onboarding/station' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'How it works', to: '/' },
      { label: 'Benefits', to: '/about' },
      { label: 'Contact your administrator', to: '/about' },
    ],
  },
];

/** Footer with clearly separated vertical columns (Brand, Navigation, Platform, Support). Stacks on small screens. */
export function PublicFooter() {
  return (
    <footer className="border-t border-white/10 bg-pub-forest">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-8 lg:px-8">
        <div>
          <Link to="/" className="inline-flex items-center gap-3" aria-label="RMA Weekly Monitoring Portal - Home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pub-yellow text-pub-forest">
              <Fuel className="h-5 w-5" aria-hidden />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-sm font-bold text-white">RMA Weekly</span>
              <span className="block text-xs text-white/60">Monitoring Portal</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Weekly reporting, station exposure and T.A.R tracking in one place for RMAs and stakeholders.
          </p>
        </div>

        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="text-sm font-bold uppercase tracking-widest text-pub-lime">{col.title}</h3>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-white/70 transition hover:text-pub-yellow">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 sm:px-6 lg:px-8">Frontend MVP with demo data. Not production-grade.</p>
      </div>
    </footer>
  );
}
