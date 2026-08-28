import type { Position } from '@/lib/types';

export interface Concentration {
  /** Herfindahl-Hirschman index over position weights, 0..1. */
  hhi: number;
  /** Rough count of "equally weighted" positions this portfolio behaves like. */
  effectivePositions: number;
  largest: { symbol: string; weight: number } | null;
  byAssetClass: Array<{ key: string; weight: number; valueUsd: number }>;
  byCurrency: Array<{ key: string; weight: number; valueUsd: number }>;
}

function group(positions: Position[], keyOf: (p: Position) => string, total: number) {
  const sums = new Map<string, number>();
  for (const p of positions) {
    const v = p.marketValueUsd;
    if (v === null) continue;
    sums.set(keyOf(p), (sums.get(keyOf(p)) ?? 0) + v);
  }
  return [...sums.entries()]
    .map(([key, valueUsd]) => ({ key, valueUsd, weight: total > 0 ? (valueUsd / total) * 100 : 0 }))
    .sort((a, b) => b.valueUsd - a.valueUsd);
}

export function computeConcentration(positions: Position[]): Concentration {
  const priced = positions.filter((p) => p.marketValueUsd !== null && p.marketValueUsd > 0);
  const total = priced.reduce((a, p) => a + (p.marketValueUsd ?? 0), 0);

  if (total <= 0) {
    return { hhi: 0, effectivePositions: 0, largest: null, byAssetClass: [], byCurrency: [] };
  }

  const hhi = priced.reduce((a, p) => a + ((p.marketValueUsd ?? 0) / total) ** 2, 0);
  const largest = priced.reduce((best, p) =>
    (p.marketValueUsd ?? 0) > (best.marketValueUsd ?? 0) ? p : best,
  );

  return {
    hhi,
    effectivePositions: hhi > 0 ? 1 / hhi : 0,
    largest: { symbol: largest.symbol, weight: ((largest.marketValueUsd ?? 0) / total) * 100 },
    byAssetClass: group(priced, (p) => p.assetClass, total),
    byCurrency: group(priced, (p) => p.currency, total),
  };
}
