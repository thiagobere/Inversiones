import { computePositionPnl, deriveCostBasis, usdToArs } from '@/lib/analytics/pnl';
import { computeConcentration, type Concentration } from '@/lib/analytics/risk';
import { getFx, getQuotes } from '@/lib/market';
import * as repo from '@/lib/repo';
import type { FxRates, PortfolioTotals, Position, Quote } from '@/lib/types';

export interface PortfolioView {
  positions: Position[];
  totals: PortfolioTotals;
  concentration: Concentration;
  fx: FxRates;
  quotes: Record<string, Quote | null>;
  /** Symbols we hold but could not price right now. */
  unpriced: string[];
}

export async function buildPortfolio(): Promise<PortfolioView> {
  const transactions = repo.listTransactions();
  const assets = new Map(repo.listAssets().map((a) => [a.symbol, a]));

  const bySymbol = new Map<string, typeof transactions>();
  for (const tx of transactions) {
    const list = bySymbol.get(tx.symbol) ?? [];
    list.push(tx);
    bySymbol.set(tx.symbol, list);
  }

  const [fx, quotes] = await Promise.all([getFx(), getQuotes([...bySymbol.keys()])]);

  const positions: Position[] = [];
  let realizedPnlUsd = 0;

  for (const [symbol, txs] of bySymbol) {
    const basis = deriveCostBasis(txs);
    const asset = assets.get(symbol);
    const currency = asset?.currency ?? 'USD';
    const quote = quotes[symbol] ?? null;
    const pnl = computePositionPnl(basis, quote, currency, fx);

    realizedPnlUsd += currency === 'USD' ? basis.realizedPnl : (fx.ccl ? basis.realizedPnl / fx.ccl : 0);

    // A fully closed position has no market value; it stays out of the table
    // but its realised P&L above still counts.
    if (basis.quantity <= 0) continue;

    positions.push({
      symbol,
      name: quote?.name ?? asset?.name ?? symbol,
      assetClass: asset?.asset_class ?? 'us_equity',
      currency,
      quantity: basis.quantity,
      avgCost: basis.avgCost,
      costBasis: pnl.costBasis,
      costBasisUsd: pnl.costBasisUsd ?? 0,
      price: quote?.price ?? null,
      marketValue: pnl.marketValue,
      marketValueUsd: pnl.marketValueUsd,
      unrealizedPnl: pnl.unrealizedPnl,
      unrealizedPnlUsd: pnl.unrealizedPnlUsd,
      unrealizedPnlPct: pnl.unrealizedPnlPct,
      dayPnlUsd: pnl.dayPnlUsd,
      dayChangePct: quote?.changePct ?? null,
      realizedPnl: basis.realizedPnl,
      weight: 0,
    });
  }

  const marketValueUsd = positions.reduce((a, p) => a + (p.marketValueUsd ?? 0), 0);
  const costBasisUsd = positions.reduce((a, p) => a + p.costBasisUsd, 0);
  const dayPnlUsd = positions.reduce((a, p) => a + (p.dayPnlUsd ?? 0), 0);

  for (const p of positions) {
    p.weight = marketValueUsd > 0 ? ((p.marketValueUsd ?? 0) / marketValueUsd) * 100 : 0;
  }
  positions.sort((a, b) => (b.marketValueUsd ?? 0) - (a.marketValueUsd ?? 0));

  const unrealizedPnlUsd = marketValueUsd - costBasisUsd;

  return {
    positions,
    totals: {
      marketValueUsd,
      costBasisUsd,
      unrealizedPnlUsd,
      unrealizedPnlPct: costBasisUsd > 0 ? (unrealizedPnlUsd / costBasisUsd) * 100 : 0,
      dayPnlUsd,
      realizedPnlUsd,
      valueArsMep: usdToArs(marketValueUsd, fx),
    },
    concentration: computeConcentration(positions),
    fx,
    quotes,
    unpriced: positions.filter((p) => p.price === null).map((p) => p.symbol),
  };
}

/** Records today's portfolio value so the evolution chart has real history. */
export function snapshotToday(view: PortfolioView): void {
  if (view.positions.length === 0) return;
  repo.recordSnapshot({
    date: new Date().toISOString().slice(0, 10),
    total_value_usd: view.totals.marketValueUsd,
    total_cost_usd: view.totals.costBasisUsd,
    fx_mep: view.fx.mep,
    fx_ccl: view.fx.ccl,
  });
}
