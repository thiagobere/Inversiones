import { isKnownCrypto } from '@/lib/providers/coingecko';
import type { AssetClass, ProviderId } from '@/lib/types';

/**
 * A handful of the most traded CEDEARs. Used only to label an asset as a CEDEAR
 * rather than a plain local equity — pricing does not depend on this list.
 */
const CEDEAR_TICKERS = new Set([
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'KO', 'MELI', 'JNJ',
  'DISN', 'BABA', 'AMD', 'INTC', 'PFE', 'WMT', 'XOM', 'NFLX', 'PYPL', 'V', 'MA',
  'SPY', 'QQQ', 'EEM', 'ARKK', 'VIST', 'GLOB',
]);

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function classify(symbol: string): { assetClass: AssetClass; provider: ProviderId; currency: string } {
  const s = normalizeSymbol(symbol);

  if (isKnownCrypto(s) || s.endsWith('-USD')) {
    return { assetClass: 'crypto', provider: 'coingecko', currency: 'USD' };
  }

  // Buenos Aires listings carry a .BA suffix on Yahoo. Yahoo covers them with
  // history, which data912 does not, so it stays the primary source; data912 is
  // the live-board fallback.
  if (s.endsWith('.BA')) {
    const base = s.slice(0, -3);
    return {
      assetClass: CEDEAR_TICKERS.has(base) ? 'cedear' : 'ar_equity',
      provider: 'yahoo',
      currency: 'ARS',
    };
  }

  return { assetClass: 'us_equity', provider: 'yahoo', currency: 'USD' };
}

/** `GGAL.BA` -> `GGAL`, for looking the ticker up on the data912 board. */
export function baseTicker(symbol: string): string {
  return normalizeSymbol(symbol).replace(/\.BA$/, '');
}
