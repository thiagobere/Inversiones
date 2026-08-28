export type AssetClass = 'us_equity' | 'ar_equity' | 'cedear' | 'crypto';
export type ProviderId = 'yahoo' | 'coingecko' | 'data912';

export interface Asset {
  symbol: string;
  name: string;
  asset_class: AssetClass;
  currency: string;
  provider: ProviderId;
}

export interface Quote {
  symbol: string;
  name: string;
  price: number;
  previousClose: number | null;
  change: number;
  changePct: number;
  currency: string;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  marketState: string | null;
  /** Epoch ms when this quote was fetched from the provider. */
  fetchedAt: number;
  /** True when served from cache after a provider failure. */
  stale?: boolean;
}

export interface Candle {
  t: number; // epoch ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export type HistoryRange = '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y';

export interface NewsItem {
  id: string;
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
  /** Portfolio/watchlist symbols this headline was matched to. */
  symbols: string[];
  thumbnail?: string;
}

export interface FxRates {
  /** ARS per USD, by market. */
  oficial: number | null;
  blue: number | null;
  mep: number | null;
  ccl: number | null;
  cripto: number | null;
  fetchedAt: number;
  stale?: boolean;
}

export interface Transaction {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  currency: string;
  executed_at: string;
  notes: string;
}

export interface Position {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  quantity: number;
  /** Weighted-average cost per unit, in the asset's own currency. */
  avgCost: number;
  costBasis: number;
  costBasisUsd: number;
  price: number | null;
  marketValue: number | null;
  marketValueUsd: number | null;
  unrealizedPnl: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  dayPnlUsd: number | null;
  dayChangePct: number | null;
  realizedPnl: number;
  weight: number;
}

export interface PortfolioTotals {
  marketValueUsd: number;
  costBasisUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  dayPnlUsd: number;
  realizedPnlUsd: number;
  valueArsMep: number | null;
}

export interface Alert {
  id: number;
  symbol: string;
  kind: 'price_above' | 'price_below' | 'pct_change_above' | 'pct_change_below';
  threshold: number;
  note: string;
  active: number;
  triggered_at: string | null;
  triggered_px: number | null;
  created_at: string;
}

export interface Signal {
  symbol: string | null;
  severity: 'info' | 'watch' | 'strong';
  title: string;
  detail: string;
  /** What was actually computed, so the card never reads as a black box. */
  basis: string;
}
