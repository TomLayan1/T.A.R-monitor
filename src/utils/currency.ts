const naira = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compact = new Intl.NumberFormat('en-NG', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Full Naira formatting, e.g. ₦80,000,000 or -₦17,500,000. */
export const formatNaira = (value: number): string => naira.format(value);

/** Short Naira formatting for chart axes, e.g. ₦80M. */
export const formatNairaCompact = (value: number): string =>
  `${value < 0 ? '-' : ''}₦${compact.format(Math.abs(value))}`;

/** Naira amount, or a placeholder when the value is not available (e.g. S4HANA data not supplied). */
export const formatNairaOrNA = (value: number | null, placeholder = 'Not available'): string =>
  value === null ? placeholder : naira.format(value);

export type ParsedAmount =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'ok'; value: number };

/**
 * Parses a user-typed amount. An empty field is NOT zero: it is reported as `empty`
 * so required-field validation can tell "nothing entered" apart from "0".
 */
export function parseAmount(raw: string): ParsedAmount {
  const cleaned = raw.replace(/[,\s₦]/g, '');
  if (cleaned === '') return { kind: 'empty' };
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { kind: 'invalid' };
  return { kind: 'ok', value: Number(cleaned) };
}
