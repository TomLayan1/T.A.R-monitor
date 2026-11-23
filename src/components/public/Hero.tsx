import { ArrowRight, Check } from 'lucide-react';
import type { CSSProperties, PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { HeroShowcase } from './HeroShowcase';

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export function Hero() {
  const handleMove = (e: PointerEvent<HTMLElement>) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
    e.currentTarget.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2));
  };

  return (
    <section onPointerMove={handleMove} className="relative isolate overflow-hidden bg-pub-forest">
      {/* background: subtle grid + drifting light */}
      <div className="pub-grid pub-fade pointer-events-none absolute inset-0 -z-10" />
      <div className="pub-fade pointer-events-none absolute inset-0 -z-10" style={delay(100)}>
        <div className="pub-drift absolute -right-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-pub-lime/30 blur-[110px]" />
        <div className="pub-drift absolute -bottom-52 -left-32 h-[30rem] w-[30rem] rounded-full bg-pub-yellow/20 blur-[120px]" style={delay(4000)} />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-pub-lime/10 blur-[90px]" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="lg:col-span-5">
          {/* <span className="pub-rise inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-pub-lime backdrop-blur" style={delay(0)}>
            <span className="h-2 w-2 rounded-full bg-pub-yellow" /> Station monitoring platform
          </span> */}

          <h1 className="pub-rise mt-6 mb-3.5 text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl xl:text-[3.6rem]" style={delay(120)}>
            Smarter Station Monitoring.{' '}
          </h1>
          <span className="pub-rise mt-6 text-4xl font-extrabold leading-[1.06] tracking-tight bg-gradient-to-r from-pub-yellow to-pub-lime bg-clip-text text-transparent sm:text-5xl xl:text-[3.6rem]" style={delay(120)}>Better Business Decisions.</span>

          {/* <p className="pub-rise mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg" style={delay(260)}>
            One platform to monitor station performance, streamline weekly reporting, track T.A.R and financial exposure, and improve operational
            visibility across your retail network.
          </p> */}

          <div className="pub-rise mt-9 flex flex-wrap items-center gap-4" style={delay(400)}>
            <Link
              to="/sign-in"
              className="group inline-flex items-center gap-2 rounded-full bg-pub-yellow px-7 py-3.5 text-base font-bold text-pub-forest shadow-xl shadow-pub-yellow/25 transition hover:-translate-y-0.5 hover:shadow-pub-yellow/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Get Started
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-7 py-3.5 text-base font-semibold text-white transition hover:border-pub-lime hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explore Platform
            </Link>
          </div>

          {/* <ul className="pub-rise mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70" style={delay(540)}>
            {['Weekly reporting', 'T.A.R/Debt tracking', 'Approval workflows'].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-pub-lime" aria-hidden /> {t}
              </li>
            ))}
          </ul> */}
        </div>

        <div className="lg:col-span-7">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}
