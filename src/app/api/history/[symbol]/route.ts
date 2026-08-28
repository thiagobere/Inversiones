import { handle, fail } from '@/lib/api';
import { getHistory } from '@/lib/market';
import type { HistoryRange } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RANGES: HistoryRange[] = ['1d', '5d', '1mo', '6mo', '1y', '5y'];

export async function GET(request: Request, ctx: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await ctx.params;
  const raw = new URL(request.url).searchParams.get('range') ?? '1mo';

  if (!RANGES.includes(raw as HistoryRange)) {
    return fail(`range inválido. Opciones: ${RANGES.join(', ')}`, 422);
  }

  return handle(async () => ({
    symbol,
    range: raw,
    candles: await getHistory(decodeURIComponent(symbol), raw as HistoryRange),
  }));
}
