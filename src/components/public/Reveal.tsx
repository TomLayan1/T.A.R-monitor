import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Scroll-triggered entrance. Plays once when the element enters the viewport; reduced-motion users see it instantly (CSS). */
export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`pub-reveal ${visible ? 'is-visible' : ''} ${className}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

/** CSS custom property used by the entrance animations to stagger their start. */
export const delayVar = (ms: number): CSSProperties => ({ '--d': `${ms}ms` }) as CSSProperties;
