import { describe, expect, it } from 'vitest';
import { computeIndicators, rsi, sma, volatility } from '@/lib/analytics/indicators';

describe('sma', () => {
  it('averages the last N values', () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([1, 2, 3, 4, 5], 2)).toBe(4.5); // only the tail counts
  });

  it('returns null before there is enough history', () => {
    expect(sma([1, 2], 5)).toBeNull();
  });
});

describe('rsi (Wilder smoothing)', () => {
  // The canonical worked example. 15 closes -> 14 changes -> RSI 70.53.
  const wilder = [
    44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245,
    45.8433, 46.0826, 45.8931, 46.0328, 45.614, 46.282, 46.282,
  ];

  it('matches the published value for the reference series', () => {
    expect(rsi(wilder, 14)).toBeCloseTo(70.53, 2);
  });

  it('is 100 when every move is up and 0 when every move is down', () => {
    const up = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(up, 14)).toBe(100);
    expect(rsi([...up].reverse(), 14)).toBeCloseTo(0, 10);
  });

  it('returns 50 for a flat series rather than dividing by zero', () => {
    expect(rsi(Array(20).fill(100), 14)).toBe(50);
  });

  it('returns null before there is enough history', () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
});

describe('volatility', () => {
  it('is zero for a flat series', () => {
    expect(volatility(Array(40).fill(100), 30)).toBeCloseTo(0, 10);
  });

  it('is positive for a moving series', () => {
    const noisy = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 ? 3 : -3));
    expect(volatility(noisy, 30)).toBeGreaterThan(0);
  });

  it('returns null before there is enough history', () => {
    expect(volatility([1, 2, 3], 30)).toBeNull();
  });
});

describe('computeIndicators', () => {
  it('measures drawdown against the highest close in the series', () => {
    const r = computeIndicators([100, 120, 90]);
    expect(r.drawdownFromHigh).toBeCloseTo(-25, 10); // 90 vs a 120 high
  });

  it('reports nulls for windows it cannot fill yet', () => {
    const r = computeIndicators([100, 101, 102]);
    expect(r.sma20).toBeNull();
    expect(r.sma200).toBeNull();
    expect(r.rsi14).toBeNull();
  });
});
