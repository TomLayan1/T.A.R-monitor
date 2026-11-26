/**
 * Reporting weeks are identified by their week-ending SUNDAY (ISO date).
 * Reports are due the following Monday at 11:59 PM Nigeria time (WAT, UTC+1, no DST).
 */
const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const REMINDER_HOURS_WAT = [9, 11, 13, 15, 17, 19, 21, 23];

const pad = (n: number) => String(n).padStart(2, '0');

export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const utcMs = (iso: string): number => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoFromUtcMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const addDaysISO = (iso: string, days: number): string => isoFromUtcMs(utcMs(iso) + days * DAY_MS);

export const isSunday = (iso: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(iso) && new Date(utcMs(iso)).getUTCDay() === 0;

/** Calendar parts of an instant as seen in Nigeria (WAT). */
export function watParts(date: Date) {
  const w = new Date(date.getTime() + WAT_OFFSET_MS);
  return {
    year: w.getUTCFullYear(),
    month: w.getUTCMonth() + 1,
    day: w.getUTCDate(),
    hour: w.getUTCHours(),
    minute: w.getUTCMinutes(),
    dow: w.getUTCDay(),
  };
}

export const watDateISO = (date: Date): string => {
  const p = watParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
};

/** The reporting week currently being collected: the most recent Sunday (WAT) on or before today. */
export function currentWeekEnding(now: Date): string {
  const p = watParts(now);
  return addDaysISO(`${p.year}-${pad(p.month)}-${pad(p.day)}`, -p.dow);
}

/** Monday 11:59:59 PM WAT after the given week-ending Sunday. */
export const deadlineFor = (weekEnding: string): Date => {
  const [y, m, d] = weekEnding.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, 22, 59, 59, 999));
};

/** A reminder slot (WAT hour) on the Monday after the week-ending Sunday. */
export const reminderSlotTime = (weekEnding: string, hourWat: number): Date => {
  const [y, m, d] = weekEnding.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1, hourWat - 1, 0, 0, 0));
};

export const weeksBetween = (from: string, to: string): string[] => {
  const list: string[] = [];
  for (let w = from; w <= to; w = addDaysISO(w, 7)) list.push(w);
  return list;
};

/** The current reporting week plus the previous `count - 1` weeks, newest first. */
export function recentWeeks(now: Date, count = 8): string[] {
  const current = currentWeekEnding(now);
  return Array.from({ length: count }, (_, i) => addDaysISO(current, -7 * i));
}

export const formatDate = (iso: string): string =>
  new Date(utcMs(iso)).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const formatWeek = (iso: string): string => `Week ending ${formatDate(iso)}`;

export const formatDateTime = (isoTimestamp: string): string =>
  new Date(isoTimestamp).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WAT';

/** Value for <input type="datetime-local"> showing the instant in WAT. */
export const toWatInputValue = (date: Date): string => {
  const p = watParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
};

/** Parses a datetime-local string that was typed as WAT into a real instant. */
export const fromWatInputValue = (value: string): Date => {
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh - 1, mm, 0, 0));
};

/* ---- Reporting months (Account Monitoring), identified as YYYY-MM in WAT ---- */

export const isMonthKey = (m: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/** The current reporting month in Nigeria (WAT). */
export const currentMonth = (now: Date): string => {
  const p = watParts(now);
  return `${p.year}-${pad(p.month)}`;
};

export const addMonths = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
};

/** The current month plus the previous `count - 1` months, newest first. */
export const recentMonths = (now: Date, count = 12): string[] => Array.from({ length: count }, (_, i) => addMonths(currentMonth(now), -i));

export const formatMonth = (month: string): string => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};
