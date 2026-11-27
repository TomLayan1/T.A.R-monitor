import { ArrowRight, Building2, LogIn, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { delayVar, Reveal } from '../../components/public/Reveal';
import { SIGN_IN_PATH } from '../../routes/paths';

interface Option {
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  to: string;
  iconClass: string;
  buttonClass: string;
}

const options: Option[] = [
  {
    icon: LogIn,
    title: 'Sign In',
    text: 'RMAs, Business Managers, Head of Retail, Risk and Management sign in here to reach their portal.',
    cta: 'Sign In',
    to: SIGN_IN_PATH,
    iconClass: 'bg-pub-yellow text-pub-forest',
    buttonClass: 'bg-pub-yellow text-pub-forest hover:shadow-pub-yellow/40',
  },
  {
    icon: Building2,
    title: 'Onboard a Station',
    text: 'Register a station on the platform to enable structured monitoring, reporting, and management oversight.',
    cta: 'Onboard a Station',
    to: '/onboarding/station',
    iconClass: 'bg-pub-lime text-pub-forest',
    buttonClass: 'bg-pub-lime text-pub-forest hover:shadow-pub-lime/40',
  },
];

export function GetStartedPage() {
  return (
    <section className="relative isolate overflow-hidden bg-pub-forest">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="pub-grid absolute inset-0" />
        <div className="pub-drift absolute -left-24 top-10 h-96 w-96 rounded-full bg-pub-lime/35 blur-[110px]" />
        <div className="pub-drift absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-pub-yellow/25 blur-[120px]" style={delayVar(4000)} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="pub-rise text-4xl font-extrabold tracking-tight text-white sm:text-5xl">How would you like to get started?</h1>
          <p className="pub-rise mt-4 text-lg text-white/70" style={delayVar(120)}>
            Sign in to your portal, or register a new station on the platform.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {options.map((o, i) => (
            <Reveal key={o.title} delay={i * 120} className="h-full">
              <article className="pub-glass flex h-full flex-col p-8">
                <span className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg ${o.iconClass}`}>
                  <o.icon className="h-7 w-7" aria-hidden />
                </span>
                <h2 className="relative mt-7 text-2xl font-bold text-white">{o.title}</h2>
                <p className="relative mt-3 flex-1 leading-relaxed text-white/80">{o.text}</p>
                <Link
                  to={o.to}
                  className={`group relative mt-8 inline-flex whitespace-nowrap items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold shadow-lg transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${o.buttonClass}`}
                >
                  {o.cta}
                  <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
