import { cached } from '@/lib/market/cache';
import { baseTicker, classify, normalizeSymbol } from '@/lib/market/symbols';
import * as coingecko from '@/lib/providers/coingecko';
import * as data912 from '@/lib/providers/data912';
import * as dolarapi from '@/lib/providers/dolarapi';
import * as yahoo from '@/lib/providers/yahoo';
import * as yahooRss from '@/lib/providers/yahoo-rss';
import type { Candle, FxRates, HistoryRange, NewsItem, Quote } from '@/lib/types';

const QUOTE_TTL = 60_000;
const HISTORY_TTL = 5 * 60_000;
const FX_TTL = 10 * 60_000;
const NEWS_TTL = 10 * 60_000;

export async function getFx(): Promise<FxRates> {
  const { value, stale } = await cached('fx:dolares', FX_TTL, dolarapi.getRates);
  return { ...value, stale };
}

async function fetchQuote(symbol: string): Promise<Quote> {
  const { provider } = classify(symbol);
  if (provider === 'coingecko') return coingecko.getQuote(symbol);

  try {
    return await yahoo.getQuote(symbol);
  } catch (err) {
    // Local tickers occasionally miss on Yahoo; the data912 board is the backup.
    if (symbol.endsWith('.BA')) {
      const panel = await data912.getPanels();
      const row = panel[baseTicker(symbol)];
      if (row) return data912.rowToQuote(symbol, row);
    }
    throw err;
  }
}

export async function getQuote(symbol: string): Promise<Quote> {
  const s = normalizeSymbol(symbol);
  const { value, stale } = await cached(`quote:${s}`, QUOTE_TTL, () => fetchQuote(s));
  return { ...value, stale };
}

/** Never rejects: a symbol that cannot be priced comes back as null so one bad
 *  ticker does not blank out the whole portfolio table. */
export async function getQuotes(symbols: string[]): Promise<Record<string, Quote | null>> {
  const unique = [...new Set(symbols.map(normalizeSymbol))];
  const results = await Promise.all(
    unique.map(async (s) => {
      try {
        return [s, await getQuote(s)] as const;
      } catch (err) {
        console.warn(`[market] could not price ${s}:`, err);
        return [s, null] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}

export async function getHistory(symbol: string, range: HistoryRange): Promise<Candle[]> {
  const s = normalizeSymbol(symbol);
  const { provider } = classify(s);
  const { value } = await cached(`hist:${s}:${range}`, HISTORY_TTL, () =>
    provider === 'coingecko' ? coingecko.getHistory(s, range) : yahoo.getHistory(s, range),
  );
  return value;
}

export async function getNewsFor(symbols: string[], perSymbol = 6): Promise<NewsItem[]> {
  const unique = [...new Set(symbols.map(normalizeSymbol))].slice(0, 12);

  const batches = await Promise.all(
    unique.map(async (s) => {
      try {
        const { value } = await cached(`news:${s}`, NEWS_TTL, () => yahooRss.getNews(s, perSymbol));
        return value;
      } catch {
        return [] as NewsItem[];
      }
    }),
  );

  // The same story often surfaces under several tickers. Merge by link and keep
  // every symbol it matched, so the reader sees which holdings it touches.
  const byLink = new Map<string, NewsItem>();
  for (const item of batches.flat()) {
    const existing = byLink.get(item.link);
    if (existing) {
      for (const sym of item.symbols) {
        if (!existing.symbols.includes(sym)) existing.symbols.push(sym);
      }
    } else {
      byLink.set(item.link, { ...item });
    }
  }

  return [...byLink.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}

/** Market-wide headlines, keyed off broad index and macro proxies. */
export async function getGeneralNews(): Promise<NewsItem[]> {
  return getNewsFor(['SPY', 'QQQ', 'BTC-USD', 'DIA'], 8);
}

export { search } from '@/lib/providers/yahoo';
