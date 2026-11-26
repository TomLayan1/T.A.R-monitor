import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MonthlyLog } from '../src/types/monthly-log';
import { monthValidationError, openingPositionFor } from '../src/services/monthly-log.service';

const log = (stationId: string, reportingMonth: string, closingStock: number, closingBalanceCit: number): MonthlyLog => ({
  id: `${stationId}-${reportingMonth}`, stationId, stationCode: null, stationName: stationId, reportingMonth,
  openingStock: 0, openingBalanceCit: 0, closingStock, closingBalanceCit, openingSource: 'first-log',
  carriedFromLogId: null, carriedFromMonth: null, rmaId: 'rma', bmId: null, submittedAt: '2026-01-01T00:00:00Z', comments: null,
});

const logs = [
  log('A', '2026-07', 2_000_000, 600_000),
  log('A', '2026-08', 3_000_000, 500_000),
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
