import { fetchJson } from '@/lib/market/http';
import type { Candle, HistoryRange, Quote } from '@/lib/types';

const BASE = 'https://api.coingecko.com/api/v3';

/**
 * We address crypto as `BTC-USD` style symbols everywhere in the app.
 * CoinGecko wants its own ids, so this is the bridge. Kept small and explicit
 * rather than fetching the 15k-entry coin list on every call.
 */
const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  ADA: 'cardano',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  BNB: 'binancecoin',
  MATIC: 'matic-network',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  LTC: 'litecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
};

export function toCoinId(symbol: string): string | null {
  const base = symbol.replace(/-USD$/i, '').toUpperCase();
  return COIN_IDS[base] ?? null;
}

export function isKnownCrypto(symbol: string): boolean {
  return toCoinId(symbol) !== null;
}

interface MarketRow {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
  high_24h: number | null;
  low_24h: number | null;
  total_volume: number | null;
  ath: number | null;
  atl: number | null;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const id = toCoinId(symbol);
  if (!id) throw new Error(`Unknown crypto symbol: ${symbol}`);

  const rows = await fetchJson<MarketRow[]>(`${BASE}/coins/markets?vs_currency=usd&ids=${id}`);
  const row = rows[0];
  if (!row) throw new Error(`CoinGecko returned no data for ${symbol}`);

  const change = row.price_change_24h ?? 0;
  return {
    symbol: symbol.toUpperCase(),
    name: row.name,
    price: row.current_price,
    previousClose: row.current_price - change,
    change,
    changePct: row.price_change_percentage_24h ?? 0,
    currency: 'USD',
    dayHigh: row.high_24h,
    dayLow: row.low_24h,
    // Crypto trades continuously, so a 52-week window is not meaningful the way
    // it is for equities. All-time high/low is the comparable anchor.
    fiftyTwoWeekHigh: row.ath,
    fiftyTwoWeekLow: row.atl,
    volume: row.total_volume,
    marketState: 'REGULAR',
    fetchedAt: Date.now(),
  };
}

const RANGE_DAYS: Record<HistoryRange, string> = {
  '1d': '1',
  '5d': '5',
  '1mo': '30',
  '6mo': '180',
  '1y': '365',
  '5y': 'max',
};

interface MarketChart {
  prices: [number, number][];
  total_volumes: [number, number][];
}

export async function getHistory(symbol: string, range: HistoryRange): Promise<Candle[]> {
  const id = toCoinId(symbol);
  if (!id) throw new Error(`Unknown crypto symbol: ${symbol}`);

  const data = await fetchJson<MarketChart>(
    `${BASE}/coins/${id}/market_chart?vs_currency=usd&days=${RANGE_DAYS[range]}`,
  );

  // market_chart gives a price series, not OHLC. We flatten each point into a
  // degenerate candle so downstream indicators (which only read `c`) work
  // uniformly across providers.
  return data.prices.map(([t, price], i) => ({
    t,
    o: price,
    h: price,
    l: price,
    c: price,
    v: data.total_volumes[i]?.[1] ?? 0,
  }));
}
