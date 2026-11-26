import { ArrowRight, BellRing, ClipboardList, LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Hero } from '../../components/public/Hero';
import { Reveal } from '../../components/public/Reveal';

const steps = [
  {
    icon: ClipboardList,
    title: 'RMAs report weekly',
    text: 'Enter Trade Balance, Available Stock and Cash in Till for each assigned station. Available Credit, Total Stock, TAR and Exposure are calculated for you.',
  },
  {
    icon: LayoutDashboard,
    title: 'Management sees everything',
    text: 'Dashboards consolidate every station, RMA and BM in one live view, built from each station\u2019s latest report.',
  },
  {
    icon: BellRing,
    title: 'Alerts reach everyone',
    text: 'Every positive TAR position alerts all users, and late weekly reports are flagged automatically.',
  },
];

export function HomePage() {
  return (
    <>
      <Hero />

      <section className="bg-white py-20 text-pub-ink sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest text-pub-lime">How it works</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-pub-forest sm:text-4xl">
              From weekly report to management insight
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <div className="group h-full rounded-2xl border border-pub-ink/10 bg-white p-7 transition hover:-translate-y-1 hover:border-pub-lime hover:shadow-xl hover:shadow-pub-forest/10">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-pub-forest text-pub-yellow transition group-hover:scale-105">
                      <s.icon className="h-6 w-6" aria-hidden />
                    </span>
                    <span className="text-5xl font-extrabold text-pub-ink/10">0{i + 1}</span>
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-pub-forest">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-pub-ink/75">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-pub-forest py-20">
        <div className="pointer-events-none absolute -right-24 top-0 -z-10 h-72 w-72 rounded-full bg-pub-lime/25 blur-[100px]" />
        <div className="pointer-events-none absolute -left-24 bottom-0 -z-10 h-72 w-72 rounded-full bg-pub-yellow/20 blur-[100px]" />
        <Reveal className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Ready to see your station network clearly?</h2>
          <p className="mt-4 text-white/70">Sign in with your role and start monitoring, reporting and reviewing.</p>
          <Link
            to="/get-started"
            className="group mt-8 inline-flex whitespace-nowrap items-center gap-2 rounded-full bg-pub-yellow px-8 py-4 text-base font-bold text-pub-forest shadow-xl shadow-pub-yellow/25 transition hover:-translate-y-0.5"
          >
            Get Started <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" aria-hidden />
          </Link>
        </Reveal>
      </section>
    </>
  );
}
