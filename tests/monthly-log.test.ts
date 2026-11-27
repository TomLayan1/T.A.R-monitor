import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MonthlyLog } from '../src/types/monthly-log';
import { buildFinancialMonitorRows, monthValidationError, normalizeMonthlyLog, openingPositionFor } from '../src/services/monthly-log.service';
import type { Station } from '../src/types/station';

const log = (stationId: string, reportingMonth: string, closingStock: number, closingBalanceCit: number, closingBalance = 0): MonthlyLog => ({
  id: `${stationId}-${reportingMonth}`, stationId, stationCode: null, stationName: stationId, reportingMonth,
  openingStock: 0, openingBalanceCit: 0, closingStock, closingBalanceCit,
  openingBalance: 0, turnover: closingBalance, payment: 0, nonStockMargin: 0, closingBalance, securityBalance: 10_000_000,
  openingSource: 'first-log',
  carriedFromLogId: null, carriedFromMonth: null, rmaId: 'rma', bmId: null, submittedAt: '2026-01-01T00:00:00Z', comments: null,
});

const logs = [
  log('A', '2026-07', 2_000_000, 600_000),
  log('A', '2026-08', 3_000_000, 500_000, 750_000),
  log('B', '2026-08', 9_000_000, 900_000),
];

test('first monthly log opens at zero', () => {
  const o = openingPositionFor(logs, 'C', '2026-09');
  assert.deepEqual([o.openingStock, o.openingBalanceCit, o.source], [0, 0, 'first-log']);
});

test('closings carry forward separately into the next month', () => {
  const o = openingPositionFor(logs, 'A', '2026-09');
  assert.equal(o.openingStock, 3_000_000);
  assert.equal(o.openingBalanceCit, 500_000);
  assert.equal(o.openingBalance, 750_000);
  assert.equal(o.fromLog?.reportingMonth, '2026-08');
  assert.equal(o.skippedMonths, false);
});

test('skipped month uses the most recent earlier record of the same station only', () => {
  const o = openingPositionFor(logs, 'A', '2026-11');
  assert.equal(o.openingStock, 3_000_000);
  assert.equal(o.skippedMonths, true);
  assert.equal(openingPositionFor(logs, 'B', '2026-09').openingStock, 9_000_000);
});

test('duplicates, future months and back-fills are refused', () => {
  const now = new Date('2026-11-26T10:00:00Z');
  assert.match(monthValidationError(logs, 'A', '2026-08', now) ?? '', /already exists/);
  assert.match(monthValidationError(logs, 'A', '2026-12', now) ?? '', /future/);
  assert.match(monthValidationError(logs, 'A', '2026-06', now) ?? '', /Earlier months/);
  assert.equal(monthValidationError(logs, 'A', '2026-10', now), null);
});

test('logs saved before the new fields read them as 0 and keep the default security balance', () => {
  const legacy = { ...log('A', '2026-08', 1, 1) } as Partial<MonthlyLog>;
  delete legacy.turnover; delete legacy.payment; delete legacy.nonStockMargin; delete legacy.openingBalance; delete legacy.closingBalance; delete legacy.securityBalance;
  const n = normalizeMonthlyLog(legacy as MonthlyLog);
  assert.deepEqual([n.turnover, n.payment, n.nonStockMargin, n.openingBalance, n.closingBalance, n.securityBalance], [0, 0, 0, 0, 0, 10_000_000]);
});

test('a newly added monthly log shows up as the station row on the Financial Monitor', () => {
  const station = { id: 'A', stationCode: 'A', stationName: 'A' } as Station;
  const next = { ...log('A', '2026-09', 4_000_000, 300_000), openingBalance: 750_000, turnover: 2_000_000, payment: 1_500_000, nonStockMargin: 50_000 };
  const [row] = buildFinancialMonitorRows([station], [...logs, next], 'latest');
  assert.equal(row.log?.reportingMonth, '2026-09');
  assert.equal(row.figures?.closingBalance, 1_200_000);
});
