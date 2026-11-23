import {
  Building2,
  BellRing,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  History,
  LayoutDashboard,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Reveal } from '../../components/public/Reveal';
import { delayVar } from '../../components/public/Reveal';

const capabilities = [
  { icon: ClipboardList, text: 'Weekly reporting by RMAs' },
  { icon: Gauge, text: 'Station credit and exposure monitoring' },
  { icon: TrendingUp, text: 'T.A.R/Debt tracking' },
  { icon: BellRing, text: 'Financial notifications on positive T.A.R' },
  { icon: History, text: 'Historical reporting' },
  { icon: ClipboardCheck, text: 'Amendment requests and approval workflows' },
  { icon: Users, text: 'RMA performance monitoring' },
  { icon: Building2, text: 'Management oversight across the station network' },
];

const benefits = [
  { icon: FileSpreadsheet, title: 'Automated Reporting', text: 'Simplify weekly reporting and reduce manual Excel calculations.' },
  { icon: Wallet, title: 'Financial Visibility', text: 'Monitor station exposure, available stock, and T.A.R/Debt positions.' },
  { icon: BellRing, title: 'Proactive Risk Monitoring', text: 'Identify positive T.A.R/Debt positions as they are reported, through automated alerts to every user.' },
  { icon: UserCheck, title: 'Improved Accountability', text: 'Track weekly submissions, outstanding reports, and RMA performance.' },
  { icon: LayoutDashboard, title: 'Centralised Management', text: 'Give stakeholders a unified view of station performance and operational activities.' },
  { icon: ClipboardCheck, title: 'Transparent Approvals', text: 'Manage amendment requests through structured approval workflows and audit history.' },
];

export function AboutPage() {
  return (
    <>
      {/* Section 1: About the platform */}
      <section className="relative isolate overflow-hidden bg-pub-ink">
        <div className="pub-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="pointer-events-none absolute -left-32 top-0 -z-10 h-96 w-96 rounded-full bg-pub-lime/20 blur-[110px]" />
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          <div>
            <p className="pub-rise text-sm font-bold uppercase tracking-widest text-pub-yellow">About the platform</p>
            <h1 className="pub-rise mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl" style={delayVar(100)}>
              One Platform. Complete Operational Visibility.
            </h1>
            <p className="pub-rise mt-6 text-lg leading-relaxed text-white/75" style={delayVar(220)}>
              The platform centralises station monitoring, weekly reporting, financial exposure tracking, and management oversight. RMAs
              report each week; management sees every station, every RMA and every report in one place, with alerts and approvals built in.
            </p>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((c, i) => (
              <Reveal key={c.text} delay={i * 60}>
                <li className="flex h-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-pub-lime/60 hover:bg-white/[0.07]">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pub-yellow text-pub-forest">
                    <c.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="pt-1.5 text-sm font-medium text-white">{c.text}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 2: Benefits - glassmorphism cards over luminous dark green */}
      <section className="relative isolate overflow-hidden bg-pub-forest py-20 sm:py-28">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="pub-drift absolute left-[8%] top-[6%] h-80 w-80 rounded-full bg-pub-lime/45 blur-[90px]" />
          <div className="pub-drift absolute right-[6%] top-[38%] h-96 w-96 rounded-full bg-pub-yellow/30 blur-[110px]" style={delayVar(3000)} />
          <div className="pub-drift absolute bottom-[4%] left-[32%] h-80 w-80 rounded-full bg-pub-lime/30 blur-[100px]" style={delayVar(6000)} />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-widest text-pub-lime">Benefits</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Built for accountability and clarity</h2>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 110}>
                <article className="pub-glass h-full p-7">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-pub-yellow text-pub-forest shadow-lg shadow-pub-yellow/30">
                    <b.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="relative mt-6 text-xl font-bold text-white">{b.title}</h3>
                  <p className="relative mt-2 leading-relaxed text-white/80">{b.text}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
