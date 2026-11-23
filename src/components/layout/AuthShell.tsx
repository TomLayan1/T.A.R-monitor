import { BellRing, ClipboardCheck, Fuel, ShieldAlert, TrendingUp } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

/** Animated brand panel: drifting light, slow rotating rings, a grid and a softly pulsing "report" card. */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-brand text-white lg:flex lg:h-screen lg:flex-col lg:justify-between lg:p-12 lg:sticky lg:top-0">
      {/* layered, animated background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#02512a] via-brand to-[#01220f]" />
        <div className="auth-blob absolute -left-24 -top-24 h-[26rem] w-[26rem] rounded-full bg-[#2fa866]/40 blur-[90px]" />
        <div className="auth-blob absolute -bottom-32 right-[-6rem] h-[28rem] w-[28rem] rounded-full bg-[#0f7a40]/55 blur-[100px]" style={d(5000)} />
        <div className="auth-blob absolute left-1/3 top-1/2 h-60 w-60 rounded-full bg-[#9ad9b4]/20 blur-[80px]" style={d(9000)} />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'radial-gradient(ellipse at 50% 50%, #000 20%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, #000 20%, transparent 75%)',
          }}
        />
        <div className="auth-ring absolute -right-40 top-1/4 h-[34rem] w-[34rem] rounded-full border border-white/10">
          <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />
        </div>
        <div className="auth-ring-rev absolute -right-24 top-[32%] h-[24rem] w-[24rem] rounded-full border border-dashed border-white/15" />
      </div>

      <Link to="/" className="relative z-10 flex items-center gap-3" aria-label="Back to website">
        <span className="rounded-xl bg-white/15 p-2.5 backdrop-blur">
          <Fuel className="h-7 w-7" aria-hidden />
        </span>
        <span className="leading-tight">
          <span className="block text-lg font-semibold">RMA Weekly</span>
          <span className="block text-sm text-white/70">Monitoring Portal</span>
        </span>
      </Link>

      <div className="relative z-10">
        <h2 className="auth-rise max-w-md text-4xl font-semibold leading-tight">Every station. Every week. One clear picture.</h2>
        <p className="auth-rise mt-4 max-w-md text-white/75" style={d(150)}>
          Sign in to report, review and act, whichever role you hold.
        </p>

        <div className="auth-rise relative mt-10 max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md auth-shine" style={d(300)}>
          <div className="flex items-center justify-between text-sm text-white/80">
            <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4" aria-hidden /> Weekly reporting</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">Live</span>
          </div>
          <div className="mt-5 flex h-20 items-end gap-2" aria-hidden>
            {[0.6, 0.9, 0.45, 0.75, 1, 0.55, 0.8].map((h, i) => (
              <span key={i} className="auth-bar flex-1 rounded-t bg-gradient-to-t from-white/30 to-white/80" style={{ height: `${h * 100}%`, ...d(i * 280) }} />
            ))}
          </div>
        </div>

        <ul className="auth-rise mt-8 space-y-3 text-sm text-white/80" style={d(450)}>
          {[
            [ClipboardCheck, 'Structured weekly reports and approvals'],
            [BellRing, 'Instant alerts on positive T.A.R/Debt'],
          ].map(([Icon, text]) => {
            const I = Icon as typeof ClipboardCheck;
            return (
              <li key={text as string} className="flex items-center gap-3">
                <I className="h-5 w-5 text-white/90" aria-hidden /> {text as string}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="relative z-10 text-sm text-white/60">Frontend MVP, demo data only</p>
    </div>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-start justify-center bg-white px-4 py-10 sm:px-8 lg:items-center lg:overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand lg:hidden">
            <Fuel className="h-4 w-4" aria-hidden /> RMA Weekly Monitoring Portal
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
            <p>Demo authentication only. Accounts are kept in your browser's LocalStorage and are not production-grade security.</p>
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
