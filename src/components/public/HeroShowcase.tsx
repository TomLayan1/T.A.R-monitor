import { Bell, ClipboardList } from 'lucide-react';
import dashboardShot from '../../assets/screenshots/rma-dashboard.jpeg';
import stationsShot from '../../assets/screenshots/rma-stations.jpeg';
import { delayVar } from './Reveal';

/** Browser-style frame around a real screenshot. The image is only cropped (object-cover), never distorted. */
function BrowserFrame({ src, alt, label, ratio }: { src: string; alt: string; label: string; ratio: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/20 bg-pub-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-black/20">
      <div className="flex items-center gap-2 border-b border-white/10 bg-pub-ink px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        <span className="ml-3 flex-1 truncate rounded-md bg-black/25 px-3 py-1 text-[11px] text-white/60">{label}</span>
      </div>
      <div className="overflow-hidden bg-white" style={{ aspectRatio: ratio }}>
        <img src={src} alt={alt} className="h-full w-full object-cover object-top" loading="eager" draggable={false} />
      </div>
    </div>
  );
}

const layer = (x: number, y: number) => ({
  transform: `translate3d(calc(var(--mx, 0) * ${x}px), calc(var(--my, 0) * ${y}px), 0)`,
  transition: 'transform 0.3s ease-out',
});

/** Layered product illustration built from the two real screenshots, with pointer parallax. */
export function HeroShowcase() {
  return (
    <div className="pub-pop relative mx-auto w-full max-w-[640px] pb-14 pt-4 lg:max-w-none" style={delayVar(350)}>
      {/* soft light behind the product */}
      <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-pub-lime/25 via-transparent to-pub-yellow/20 blur-2xl" />

      <div style={layer(-10, -6)} className="[perspective:1800px]">
        <div className="transition-transform duration-700 [transform:rotateY(-9deg)_rotateX(4deg)] hover:[transform:rotateY(-3deg)_rotateX(1deg)]">
          <BrowserFrame
            src={dashboardShot}
            alt="RMA portal dashboard showing station count, credit totals, top stations by T.A.R/Debt and credit utilisation"
            label="RMA Portal / Dashboard"
            ratio="1600 / 720"
          />
        </div>
      </div>

      <div style={layer(14, 10)} className="absolute -bottom-2 -left-2 w-[62%] sm:-left-8 [perspective:1800px]">
        <div className="pub-float transition-transform duration-700 [transform:rotateY(8deg)_rotateX(3deg)]" style={delayVar(600)}>
          <BrowserFrame
            src={stationsShot}
            alt="RMA portal Stations tab listing assigned stations with available credit, exposure and a Weekly Log button"
            label="RMA Portal / Stations"
            ratio="1498 / 640"
          />
        </div>
      </div>

      <div style={layer(20, 6)} className="absolute -right-1 top-0 hidden sm:block">
        <div className="pub-float pub-glass flex items-center gap-2.5 px-4 py-2.5 !rounded-full text-sm font-semibold text-white" style={delayVar(300)}>
          <ClipboardList className="h-4 w-4 text-pub-yellow" aria-hidden /> Weekly reporting
        </div>
      </div>
      <div style={layer(24, 14)} className="absolute -bottom-3 right-0 hidden sm:block">
        <div className="pub-float pub-glass flex items-center gap-2.5 px-4 py-2.5 !rounded-full text-sm font-semibold text-white" style={delayVar(900)}>
          <Bell className="h-4 w-4 text-pub-lime" aria-hidden /> T.A.R/Debt alerts
        </div>
      </div>
    </div>
  );
}
