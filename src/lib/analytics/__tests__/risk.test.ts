import { describe, expect, it } from 'vitest';
import { computeConcentration } from '@/lib/analytics/risk';
import type { Position } from '@/lib/types';

function pos(symbol: string, marketValueUsd: number | null, extra: Partial<Position> = {}): Position {
  return {
    symbol, name: symbol, assetClass: 'us_equity', currency: 'USD',
    quantity: 1, avgCost: 0, costBasis: 0, costBasisUsd: 0,
    price: 1, marketValue: marketValueUsd, marketValueUsd,
    unrealizedPnl: 0, unrealizedPnlUsd: 0, unrealizedPnlPct: 0,
    dayPnlUsd: 0, dayChangePct: 0, realizedPnl: 0, weight: 0,
    ...extra,
  };
}

describe('computeConcentration', () => {
  it('reports four equal positions as four effective positions', () => {
    const c = computeConcentration(['A', 'B', 'C', 'D'].map((s) => pos(s, 100)));
    expect(c.hhi).toBeCloseTo(0.25, 10);
    expect(c.effectivePositions).toBeCloseTo(4, 10);
    expect(c.largest?.weight).toBeCloseTo(25, 10);
  });

  it('flags a dominant position', () => {
    const c = computeConcentration([pos('NVDA', 900), pos('KO', 100)]);
    expect(c.largest?.symbol).toBe('NVDA');
    expect(c.largest?.weight).toBeCloseTo(90, 10);
    expect(c.effectivePositions).toBeLessThan(2);
  });

  it('groups by asset class and currency', () => {
    const c = computeConcentration([
      pos('AAPL', 600),
      pos('BTC-USD', 400, { assetClass: 'crypto' }),
    ]);
    expect(c.byAssetClass).toEqual([
      { key: 'us_equity', valueUsd: 600, weight: 60 },
      { key: 'crypto', valueUsd: 400, weight: 40 },
    ]);
    expect(c.byCurrency).toEqual([{ key: 'USD', valueUsd: 1000, weight: 100 }]);
  });

  it('ignores positions that could not be priced', () => {
    const c = computeConcentration([pos('A', 100), pos('B', null)]);
    expect(c.largest?.weight).toBeCloseTo(100, 10);
  });

  it('handles an empty portfolio without dividing by zero', () => {
    const c = computeConcentration([]);
    expect(c.hhi).toBe(0);
    expect(c.largest).toBeNull();
  });
});
