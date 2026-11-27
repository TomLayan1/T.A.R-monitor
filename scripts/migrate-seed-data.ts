/**
 * One-off data script for the TAR Monitor / Account Monitoring update.
 *  1. Rebuilds src/data/weekly-reports.json in the WeeklyLog structure from the original seed
 *     (scripts/legacy-weekly-reports.json): Trade Balance is the figure the RMA entered (formerly labelled
 *     "Total Exposure"), Credit Limit from the S4HANA adapter, a deterministic Cash in Till, and every derived
 *     figure from utils/calculations.ts.
 *  2. Creates src/data/monthly-logs.json (Account Monitoring) following the carry-forward rule.
 * Run: npx tsx scripts/migrate-seed-data.ts   (deterministic; safe to re-run)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { calculateWeeklyFigures } from '../src/utils/calculations';
import { s4hana } from '../src/services/s4hana.service';
import type { Station } from '../src/types/station';

const DATA = new URL('../src/data/', import.meta.url);
const LEGACY = new URL('./legacy-weekly-reports.json', import.meta.url);
const read = <T>(f: string): T => JSON.parse(readFileSync(new URL(f, DATA), 'utf8')) as T;
const write = (f: string, v: unknown) => writeFileSync(new URL(f, DATA), JSON.stringify(v, null, 2) + '\n');

let seed = 20261126;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296), seed / 4294967296);
const between = (a: number, b: number) => a + rand() * (b - a);
const r10k = (n: number) => Math.round(n / 10_000) * 10_000;
// Separate generator for the monthly account-balance figures so the other seed values stay exactly as they were.
let balanceSeed = 20261127;
const balanceRand = () => ((balanceSeed = (balanceSeed * 1664525 + 1013904223) % 4294967296), balanceSeed / 4294967296);
const balanceBetween = (a: number, b: number) => a + balanceRand() * (b - a);

const stations = read<Station[]>('stations.json');
const byId = new Map(stations.map((s) => [s.id, s]));

// ---- 1. weekly reports ----
type OldReport = Record<string, unknown> & { stationId: string; reportingWeek: string; availableStock: number; totalExposure: number };
const old = JSON.parse(readFileSync(LEGACY, 'utf8')) as OldReport[];
const weekly = old.map((r) => {
  const station = byId.get(r.stationId)!;
  const { totalExposure, tarDebt: _td, availableCredit: _ac, ...rest } = r;
  const creditLimit = s4hana.getCreditLimit(station);
  const tradeBalance = totalExposure;
  const cit = r10k(between(250_000, 3_500_000));
  return { ...rest, ...calculateWeeklyFigures({ creditLimit, tradeBalance, availableStock: r.availableStock, cit }), legacy: null };
});
write('weekly-reports.json', weekly);

// ---- 2. monthly logs (Account Monitoring) ----
const months = ['2026-08', '2026-09', '2026-10'];
const monthly: Record<string, unknown>[] = [];
let n = 1;
for (const st of stations) {
  if (!st.rmaId || st.stationCode === null || st.creditLimit === null) continue;
  if (st.id === 'station-010') continue; // no history: the RMA can demo a station's FIRST monthly log (opens at ₦0)
  let prev: { id: string; month: string; closingStock: number; closingBalanceCit: number; closingBalance: number } | null = null;
  for (const month of months) {
    if (st.id === 'station-005' && month === '2026-09') continue; // skipped month: October carries forward from August
    if (st.id === 'station-019' && month === '2026-10') continue; // October not logged yet
    const openingStock = prev?.closingStock ?? 0;
    const openingBalanceCit = prev?.closingBalanceCit ?? 0;
    let closingStock = prev ? r10k(openingStock * between(0.86, 1.14)) : r10k(st.creditLimit * between(0.35, 0.7));
    if (st.id === 'station-003' && month === '2026-09') closingStock = openingStock; // with an equal balance: zero Net Effect example
    let closingBalanceCit = r10k(between(300_000, 4_000_000));
    if (st.id === 'station-003' && month === '2026-09') closingBalanceCit = openingBalanceCit;
    // Account balance: Closing Balance = Opening Balance + Turnover - Payment - Non-stock margin.
    const openingBalance = prev?.closingBalance ?? 0;
    const turnover = r10k(balanceBetween(18_000_000, 65_000_000));
    const payment = r10k(turnover * balanceBetween(0.88, 1.06));
    const nonStockMargin = balanceBetween(0, 1) < 0.6 ? 0 : r10k(balanceBetween(50_000, 600_000));
    const closingBalance = openingBalance + turnover - payment - nonStockMargin;
    const id = `mlog-${String(n++).padStart(4, '0')}`;
    const [y, m] = month.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    monthly.push({
      id,
      stationId: st.id,
      stationCode: st.stationCode,
      stationName: st.stationName,
      reportingMonth: month,
      openingStock,
      openingBalanceCit,
      closingStock,
      closingBalanceCit,
      openingBalance,
      turnover,
      payment,
      nonStockMargin,
      closingBalance,
      securityBalance: 10_000_000,
      openingSource: prev ? 'carried-forward' : 'first-log',
      carriedFromLogId: prev?.id ?? null,
      carriedFromMonth: prev?.month ?? null,
      rmaId: st.rmaId,
      bmId: st.bmId,
      submittedAt: `${next}-0${1 + Math.floor(between(0, 4))}T${String(8 + Math.floor(between(0, 9))).padStart(2, '0')}:${String(Math.floor(between(0, 59))).padStart(2, '0')}:00.000Z`,
      comments: null,
    });
    prev = { id, month, closingStock, closingBalanceCit, closingBalance };
  }
}
write('monthly-logs.json', monthly);
console.log(`weekly ${weekly.length} (positive TAR ${weekly.filter((w) => w.tar > 0).length}), monthly ${monthly.length}`);
