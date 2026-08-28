import { z } from 'zod';
import { fail, handle } from '@/lib/api';
import { getQuotes } from '@/lib/market';
import * as repo from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const symbols = repo.listWatchlist();
    return { symbols, quotes: symbols.length ? await getQuotes(symbols) : {} };
  });
}

const addSchema = z.object({ symbol: z.string().min(1), name: z.string().optional() });

export async function POST(request: Request) {
  return handle(async () => {
    const { symbol, name } = addSchema.parse(await request.json());
    return { symbol: repo.addToWatchlist(symbol, name) };
  });
}

export async function DELETE(request: Request) {
  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol) return fail('symbol requerido', 422);
  return handle(() => ({ ok: repo.removeFromWatchlist(symbol) }));
}
