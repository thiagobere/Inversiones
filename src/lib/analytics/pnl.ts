import type { FxRates, Quote, Transaction } from '@/lib/types';

export interface CostBasis {
  quantity: number;
  /** Weighted-average cost per unit, including the fees paid on buys. */
  avgCost: number;
  realizedPnl: number;
}

/**
 * Weighted-average cost basis, the convention used for retail portfolios here.
 *
 * Buys raise the average and include their fees in the basis. Sells realise
 * P&L against the average and leave it untouched — which is what makes the
 * remaining position's cost independent of the order it was sold in.
 */
export function deriveCostBasis(transactions: Transaction[]): CostBasis {
  const ordered = [...transactions].sort((a, b) => a.executed_at.localeCompare(b.executed_at));

  let quantity = 0;
  let avgCost = 0;
  let realizedPnl = 0;

  for (const tx of ordered) {
    if (tx.type === 'buy') {
      const newQty = quantity + tx.quantity;
      if (newQty <= 0) continue;
      avgCost = (quantity * avgCost + tx.quantity * tx.price + tx.fees) / newQty;
      quantity = newQty;
    } else {
      // Selling more than is held is treated as closing the position rather
      // than opening a short — this app does not model shorts.
      const sold = Math.min(tx.quantity, quantity);
      realizedPnl += sold * (tx.price - avgCost) - tx.fees;
      quantity -= sold;
      if (quantity <= 1e-9) {
        quantity = 0;
        avgCost = 0;
      }
    }
  }

  return { quantity, avgCost, realizedPnl };
}

/**
 * Local assets quote in ARS. They are converted at CCL, the rate an investor
 * actually gets moving between a local listing and dollars.
 */
export function toUsd(amount: number, currency: string, fx: FxRates): number | null {
  if (currency === 'USD') return amount;
  if (currency === 'ARS') return fx.ccl ? amount / fx.ccl : null;
  return null;
}

export function usdToArs(amount: number, fx: FxRates): number | null {
  return fx.mep ? amount * fx.mep : null;
}

export interface PositionPnl {
  marketValue: number | null;
  marketValueUsd: number | null;
  costBasis: number;
  costBasisUsd: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  dayPnlUsd: number | null;
}

export function computePositionPnl(
  basis: CostBasis,
  quote: Quote | null,
  currency: string,
  fx: FxRates,
): PositionPnl {
  const costBasis = basis.quantity * basis.avgCost;
  const costBasisUsd = toUsd(costBasis, currency, fx);

  if (!quote || basis.quantity === 0) {
    return {
      marketValue: null,
      marketValueUsd: null,
      costBasis,
      costBasisUsd,
      unrealizedPnl: null,
      unrealizedPnlUsd: null,
      unrealizedPnlPct: null,
      dayPnlUsd: null,
    };
  }

  const marketValue = basis.quantity * quote.price;
  const unrealizedPnl = marketValue - costBasis;
  const marketValueUsd = toUsd(marketValue, quote.currency, fx);
  const unrealizedPnlUsd =
    marketValueUsd !== null && costBasisUsd !== null ? marketValueUsd - costBasisUsd : null;

  const dayPnl = quote.previousClose === null ? null : basis.quantity * (quote.price - quote.previousClose);
  const dayPnlUsd = dayPnl === null ? null : toUsd(dayPnl, quote.currency, fx);

  return {
    marketValue,
    marketValueUsd,
    costBasis,
    costBasisUsd,
    unrealizedPnl,
    unrealizedPnlUsd,
    unrealizedPnlPct: costBasis > 0 ? (unrealizedPnl / costBasis) * 100 : null,
    dayPnlUsd,
  };
}
