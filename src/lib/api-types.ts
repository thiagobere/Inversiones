import type { Concentration } from '@/lib/analytics/risk';
import type { Snapshot } from '@/lib/repo';
import type {
  Alert, Candle, FxRates, NewsItem, PortfolioTotals, Position, Quote, Signal, Transaction,
} from '@/lib/types';

export interface PortfolioResponse {
  positions: Position[];
  totals: PortfolioTotals;
  concentration: Concentration;
  fx: FxRates;
  quotes: Record<string, Quote | null>;
  unpriced: string[];
  transactions: Transaction[];
}

export interface WatchlistResponse {
  symbols: string[];
  quotes: Record<string, Quote | null>;
}

export interface NewsResponse {
  items: NewsItem[];
  symbols: string[];
}

export interface AlertsResponse {
  alerts: Alert[];
  triggered: Alert[];
}

export interface HistoryResponse {
  symbol: string;
  range: string;
  candles: Candle[];
}

export interface SearchResponse {
  results: Array<{ symbol: string; name: string; quoteType: string; exchange: string }>;
}

export interface SignalsResponse {
  signals: Signal[];
}

export interface SnapshotsResponse {
  snapshots: Snapshot[];
}

export interface QuotesResponse {
  quotes: Record<string, Quote | null>;
  triggered: Alert[];
}

export interface AiResponse {
  analysis: string;
  generatedAt: number;
  model: string;
}
