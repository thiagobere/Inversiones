import { describe, expect, it } from 'vitest';
import { computePositionPnl, deriveCostBasis, toUsd, usdToArs } from '@/lib/analytics/pnl';
import type { FxRates, Quote, Transaction } from '@/lib/types';

let nextId = 1;
function tx(p: Partial<Transaction> & Pick<Transaction, 'type' | 'quantity' | 'price'>): Transaction {
  return {
    id: nextId++,
    symbol: 'TEST',
    fees: 0,
    currency: 'USD',
    executed_at: '2026-01-01',
    notes: '',
    ...p,
  };
}

const fx: FxRates = { oficial: 1510, blue: 1545, mep: 1539, ccl: 1602, cripto: 1597, fetchedAt: 0 };

describe('deriveCostBasis', () => {
  it('averages two buys by quantity', () => {
    const b = deriveCostBasis([
      tx({ type: 'buy', quantity: 10, price: 100 }),
      tx({ type: 'buy', quantity: 10, price: 200 }),
    ]);
    expect(b.quantity).toBe(20);
    expect(b.avgCost).toBeCloseTo(150, 10);
    expect(b.realizedPnl).toBe(0);
  });

  it('folds buy fees into the cost basis', () => {
    const b = deriveCostBasis([tx({ type: 'buy', quantity: 10, price: 100, fees: 10 })]);
    expect(b.avgCost).toBeCloseTo(101, 10);
  });

  it('realises P&L against the average and leaves the average alone', () => {
    const b = deriveCostBasis([
      tx({ type: 'buy', quantity: 10, price: 100, executed_at: '2026-01-01' }),
      tx({ type: 'buy', quantity: 10, price: 200, executed_at: '2026-01-02' }),
      tx({ type: 'sell', quantity: 5, price: 250, executed_at: '2026-01-03' }),
    ]);
    expect(b.realizedPnl).toBeCloseTo(500, 10); // 5 * (250 - 150)
    expect(b.quantity).toBe(15);
    expect(b.avgCost).toBeCloseTo(150, 10);
  });

  it('subtracts sell fees from realised P&L', () => {
    const b = deriveCostBasis([
      tx({ type: 'buy', quantity: 10, price: 100, executed_at: '2026-01-01' }),
      tx({ type: 'sell', quantity: 10, price: 120, fees: 15, executed_at: '2026-01-02' }),
    ]);
    expect(b.realizedPnl).toBeCloseTo(185, 10); // 10 * 20 - 15
    expect(b.quantity).toBe(0);
    expect(b.avgCost).toBe(0);
  });

  it('applies transactions in date order regardless of input order', () => {
    const late = tx({ type: 'sell', quantity: 5, price: 250, executed_at: '2026-01-03' });
    const early = tx({ type: 'buy', quantity: 10, price: 100, executed_at: '2026-01-01' });
    expect(deriveCostBasis([late, early]).realizedPnl).toBeCloseTo(750, 10);
  });

  it('closes the position rather than going short on an oversized sell', () => {
    const b = deriveCostBasis([
      tx({ type: 'buy', quantity: 5, price: 100, executed_at: '2026-01-01' }),
      tx({ type: 'sell', quantity: 50, price: 110, executed_at: '2026-01-02' }),
    ]);
    expect(b.quantity).toBe(0);
    expect(b.realizedPnl).toBeCloseTo(50, 10); // only the 5 actually held
  });
});

describe('currency conversion', () => {
  it('leaves USD untouched', () => {
    expect(toUsd(1000, 'USD', fx)).toBe(1000);
  });

  it('converts ARS at CCL', () => {
    expect(toUsd(1_602_000, 'ARS', fx)).toBeCloseTo(1000, 6);
  });

  it('converts USD back to ARS at MEP', () => {
    expect(usdToArs(1000, fx)).toBeCloseTo(1_539_000, 6);
  });

  it('returns null when the rate is missing instead of guessing', () => {
    expect(toUsd(1000, 'ARS', { ...fx, ccl: null })).toBeNull();
  });
});

describe('computePositionPnl', () => {
  const quote: Quote = {
    symbol: 'TEST', name: 'Test', price: 250, previousClose: 240, change: 10, changePct: 4.17,
    currency: 'USD', dayHigh: null, dayLow: null, fiftyTwoWeekHigh: null, fiftyTwoWeekLow: null,
    volume: null, marketState: null, fetchedAt: 0,
  };

  it('computes unrealised P&L and the day move', () => {
    const r = computePositionPnl({ quantity: 10, avgCost: 200, realizedPnl: 0 }, quote, 'USD', fx);
    expect(r.marketValue).toBe(2500);
    expect(r.costBasis).toBe(2000);
    expect(r.unrealizedPnl).toBe(500);
    expect(r.unrealizedPnlPct).toBeCloseTo(25, 10);
    expect(r.dayPnlUsd).toBeCloseTo(100, 10); // 10 * (250 - 240)
  });

  it('reports nulls rather than zeros when the asset could not be priced', () => {
    const r = computePositionPnl({ quantity: 10, avgCost: 200, realizedPnl: 0 }, null, 'USD', fx);
    expect(r.marketValue).toBeNull();
    expect(r.unrealizedPnl).toBeNull();
    expect(r.costBasis).toBe(2000); // cost is still known
  });
});
