import { handle } from '@/lib/api';
import { computeIndicators } from '@/lib/analytics/indicators';
import { getHistory, getNewsFor, getQuote } from '@/lib/market';
import { classify } from '@/lib/market/symbols';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const decoded = decodeURIComponent(symbol);

  return handle(async () => {
    // Each piece degrades on its own: a missing news feed should not cost you
    // the price, and a failed indicator run should not cost you the page.
    const [quote, closes, news] = await Promise.all([
      getQuote(decoded),
      getHistory(decoded, '1y').then((c) => c.map((x) => x.c)).catch(() => [] as number[]),
      getNewsFor([decoded], 10).catch(() => []),
    ]);

    return {
      quote,
      assetClass: classify(decoded).assetClass,
      indicators: computeIndicators(closes),
      news,
    };
  });
}
