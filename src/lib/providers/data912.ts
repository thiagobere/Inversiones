import { fetchJson } from '@/lib/market/http';
import type { Quote } from '@/lib/types';

const BASE = 'https://data912.com/live';

interface LiveRow {
  symbol: string;
  c: number; // last traded price, ARS
  px_bid: number;
  px_ask: number;
  v: number; // volume
  pct_change: number;
}

async function loadPanel(panel: 'arg_stocks' | 'arg_cedears'): Promise<LiveRow[]> {
  return fetchJson<LiveRow[]>(`${BASE}/${panel}`);
}

/** Both panels in one shot — the endpoint returns the whole board anyway. */
export async function getPanels(): Promise<Record<string, LiveRow>> {
  const [stocks, cedears] = await Promise.all([loadPanel('arg_stocks'), loadPanel('arg_cedears')]);
  const map: Record<string, LiveRow> = {};
  for (const row of [...stocks, ...cedears]) map[row.symbol.toUpperCase()] = row;
  return map;
}

export function rowToQuote(symbol: string, row: LiveRow): Quote {
  const price = row.c || row.px_ask || row.px_bid;
  const pct = row.pct_change ?? 0;
  // The panel gives a percentage but not the previous close; derive it.
  const prev = pct === -100 ? null : price / (1 + pct / 100);
  return {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    price,
    previousClose: prev,
    change: prev === null ? 0 : price - prev,
    changePct: pct,
    currency: 'ARS',
    dayHigh: null,
    dayLow: null,
    fiftyTwoWeekHigh: null,
    fiftyTwoWeekLow: null,
    volume: row.v ?? null,
    marketState: null,
    fetchedAt: Date.now(),
  };
}
