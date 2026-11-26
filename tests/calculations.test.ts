import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFinancialMonitor, calculateWeeklyFigures } from '../src/utils/calculations';

test('TAR Monitor worked example', () => {
  const f = calculateWeeklyFigures({ creditLimit: 4_000_000, tradeBalance: 3_000_000, availableStock: 5_000_000, cit: 500_000 });
  assert.equal(f.availableCredit, -1_000_000);
  assert.equal(f.totalStock, 5_500_000);
  assert.equal(f.tar, 2_000_000);
  assert.equal(f.exposure, -2_500_000);
});

test('Available Credit is null when no credit limit is on file', () => {
  const f = calculateWeeklyFigures({ creditLimit: null, tradeBalance: 3_000_000, availableStock: 5_000_000, cit: 0 });
  assert.equal(f.availableCredit, null);
  assert.equal(f.tar, 2_000_000);
});

test('Financial Monitor worked example', () => {
  const f = calculateFinancialMonitor({ openingStock: 2_000_000, openingBalanceCit: 600_000, closingStock: 3_000_000, closingBalanceCit: 500_000 });
  assert.equal(f.totalOpeningStock, 2_600_000);
  assert.equal(f.totalClosingStock, 3_500_000);
  assert.equal(f.changeInBalance, -100_000);
  assert.equal(f.changeInStock, 900_000);
  assert.equal(f.netEffect, 1_000_000);
});

test('Net Effect colours: positive is red, negative is green, zero is neutral', async () => {
  const { netEffectHex, netEffectTone } = await import('../src/utils/net-effect');
  assert.equal(netEffectTone(1_000_000), 'rose');
  assert.equal(netEffectTone(-100_000), 'green');
  assert.equal(netEffectTone(0), 'slate');
  assert.equal(netEffectHex(5), '#dc2626');
});
