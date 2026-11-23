/**
 * Single source of truth for T.A.R/Debt classification and colour:
 *   positive (> 0)  -> Debt / positive T.A.R : red text on a very light red background
 *   negative (< 0)  -> negative T.A.R        : green
 *   exactly zero    -> neutral               : default styling
 * There is no amount threshold of any kind.
 */
export type TarLevel = 'positive' | 'negative' | 'zero';

export const tarLevel = (value: number): TarLevel => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');

const textClasses: Record<TarLevel, string> = {
  positive: 'bg-red-50 text-red-600',
  negative: 'bg-green-50 text-green-700',
  zero: 'text-slate-700',
};

const hexColours: Record<TarLevel, string> = {
  positive: '#dc2626',
  negative: '#16a34a',
  zero: '#94a3b8',
};

const labels: Record<TarLevel, string> = {
  positive: 'Debt',
  negative: 'Negative T.A.R',
  zero: 'Neutral',
};

const tones: Record<TarLevel, 'green' | 'slate' | 'rose'> = {
  positive: 'rose',
  negative: 'green',
  zero: 'slate',
};

export const tarTextClass = (value: number): string => textClasses[tarLevel(value)];
export const tarHex = (value: number): string => hexColours[tarLevel(value)];
export const tarLabel = (value: number): string => labels[tarLevel(value)];
export const tarTone = (value: number) => tones[tarLevel(value)];
