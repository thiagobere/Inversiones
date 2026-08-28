import { fetchJson } from '@/lib/market/http';
import type { Candle, HistoryRange, Quote } from '@/lib/types';

const BASE = 'https://query1.finance.yahoo.com';

interface ChartMeta {
  symbol: string;
  currency?: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketVolume?: number;
}

interface ChartResponse {
  chart: {
    result?: Array<{
      meta: ChartMeta;
      timestamp?: number[];
      indicators: {
        quote: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
    error?: { description?: string } | null;
  };
}

const RANGE_INTERVAL: Record<HistoryRange, string> = {
  '1d': '5m',
  '5d': '30m',
  '1mo': '1d',
  '6mo': '1d',
  '1y': '1d',
  '5y': '1wk',
};

function chartUrl(symbol: string, range: string, interval: string): string {
  return `${BASE}/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
}

async function getChart(symbol: string, range: string, interval: string) {
  const data = await fetchJson<ChartResponse>(chartUrl(symbol, range, interval));
  const result = data.chart.result?.[0];
  if (!result) throw new Error(data.chart.error?.description ?? `Yahoo returned no data for ${symbol}`);
  return result;
}

export async function getQuote(symbol: string): Promise<Quote> {
  const { meta } = await getChart(symbol, '5d', '1d');
  const price = meta.regularMarketPrice ?? 0;
  const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
  const change = prev === null ? 0 : price - prev;

  return {
    symbol: meta.symbol ?? symbol,
    name: meta.longName ?? meta.shortName ?? symbol,
    price,
    previousClose: prev,
    change,
    changePct: prev ? (change / prev) * 100 : 0,
    currency: meta.currency ?? 'USD',
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
    volume: meta.regularMarketVolume ?? null,
    marketState: null,
    fetchedAt: Date.now(),
  };
}

export async function getHistory(symbol: string, range: HistoryRange): Promise<Candle[]> {
  const result = await getChart(symbol, range, RANGE_INTERVAL[range]);
  const ts = result.timestamp ?? [];
  const q = result.indicators.quote[0] ?? {};

  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c === null || c === undefined) continue; // Yahoo pads gaps with nulls
    candles.push({
      t: ts[i] * 1000,
      o: q.open?.[i] ?? c,
      h: q.high?.[i] ?? c,
      l: q.low?.[i] ?? c,
      c,
      v: q.volume?.[i] ?? 0,
    });
  }
  return candles;
}

interface SearchResponse {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchDisp?: string;
    isYahooFinance?: boolean;
  }>;
}

export interface SearchHit {
  symbol: string;
  name: string;
  quoteType: string;
  exchange: string;
}

export async function search(query: string): Promise<SearchHit[]> {
  const url = `${BASE}/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=12&newsCount=0`;
  const data = await fetchJson<SearchResponse>(url);
  return (data.quotes ?? [])
    .filter((q) => q.isYahooFinance && q.symbol)
    .map((q) => ({
      symbol: q.symbol as string,
      name: q.longname ?? q.shortname ?? (q.symbol as string),
      quoteType: q.quoteType ?? 'EQUITY',
      exchange: q.exchDisp ?? '',
    }));
}

