import { getQuotes } from '@/lib/market';
import * as repo from '@/lib/repo';
import type { Alert, Quote } from '@/lib/types';

function isTriggered(alert: Alert, quote: Quote): boolean {
  switch (alert.kind) {
    case 'price_above':
      return quote.price >= alert.threshold;
    case 'price_below':
      return quote.price <= alert.threshold;
    case 'pct_change_above':
      return quote.changePct >= alert.threshold;
    case 'pct_change_below':
      return quote.changePct <= alert.threshold;
  }
}

/**
 * Evaluates every active alert against live prices.
 *
 * There is no background worker: this runs whenever quotes are refreshed, which
 * means alerts only fire while the app is open. That limitation is stated in the
 * README rather than hidden behind a spinner.
 */
export async function evaluateAlerts(): Promise<Alert[]> {
  const active = repo.listAlerts().filter((a) => a.active === 1);
  if (active.length === 0) return [];

  const quotes = await getQuotes(active.map((a) => a.symbol));
  const fired: Alert[] = [];

  for (const alert of active) {
    const quote = quotes[alert.symbol];
    if (!quote || !isTriggered(alert, quote)) continue;
    repo.markAlertTriggered(alert.id, quote.price);
    fired.push({ ...alert, active: 0, triggered_px: quote.price, triggered_at: new Date().toISOString() });
  }

  return fired;
}
