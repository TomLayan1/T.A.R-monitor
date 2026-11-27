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
  const f = calculateFinancialMonitor({
    openingStock: 2_000_000, openingBalanceCit: 600_000, closingStock: 3_000_000, closingBalanceCit: 500_000,
    openingBalance: 1_000_000, turnover: 4_000_000, payment: 3_500_000, nonStockMargin: 100_000,
  });
  assert.equal(f.openingAll, 2_600_000);
  assert.equal(f.closingAll, 3_500_000);
  assert.equal(f.openingNetworth, -1_400_000);
  assert.equal(f.closingNetworth, -2_500_000);
  assert.equal(f.closingBalance, 1_400_000);
  assert.equal(f.changeInBalance, 400_000);
  assert.equal(f.changeInStock, 900_000);
  assert.equal(f.netEffect, 500_000);
  assert.equal(f.securityBalance, 10_000_000);
});

test('Non-stock margin left blank counts as 0', () => {
  const f = calculateFinancialMonitor({ openingStock: 0, openingBalanceCit: 0, closingStock: 0, closingBalanceCit: 0, openingBalance: 0, turnover: 5, payment: 2 });
  assert.equal(f.nonStockMargin, 0);
  assert.equal(f.closingBalance, 3);
});

test('Net Effect colours: positive is red, negative is green, zero is neutral', async () => {
  const { netEffectHex, netEffectTone } = await import('../src/utils/net-effect');
  assert.equal(netEffectTone(1_000_000), 'rose');
  assert.equal(netEffectTone(-100_000), 'green');
  assert.equal(netEffectTone(0), 'slate');
  assert.equal(netEffectHex(5), '#dc2626');
});
