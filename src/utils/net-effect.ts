/**
 * Net Effect classification for the Financial Monitor (the formula is never changed by this):
 *   positive (> 0) -> positive movement : red
 *   negative (< 0) -> negative movement : green
 *   zero           -> no net movement   : neutral
 */
export type NetEffectLevel = 'positive' | 'negative' | 'zero';

export const netEffectLevel = (value: number): NetEffectLevel => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');

const classes: Record<NetEffectLevel, string> = {
  positive: 'bg-red-50 text-red-600',
  negative: 'bg-green-50 text-green-700',
  zero: 'bg-slate-100 text-slate-700',
};
const labels: Record<NetEffectLevel, string> = { positive: 'Positive movement', negative: 'Negative movement', zero: 'No net movement' };
const tones: Record<NetEffectLevel, 'green' | 'rose' | 'slate'> = { positive: 'rose', negative: 'green', zero: 'slate' };
const hex: Record<NetEffectLevel, string> = { positive: '#dc2626', negative: '#16a34a', zero: '#94a3b8' };

export const netEffectClass = (v: number) => classes[netEffectLevel(v)];
export const netEffectLabel = (v: number) => labels[netEffectLevel(v)];
export const netEffectTone = (v: number) => tones[netEffectLevel(v)];
export const netEffectHex = (v: number) => hex[netEffectLevel(v)];
