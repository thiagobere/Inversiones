import { handle } from '@/lib/api';
import { getGeneralNews, getNewsFor } from '@/lib/market';
import * as repo from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const scope = new URL(request.url).searchParams.get('scope') ?? 'general';

    if (scope === 'portfolio') {
      const held = [...new Set(repo.listTransactions().map((t) => t.symbol))];
      const watched = repo.listWatchlist();
      const symbols = [...new Set([...held, ...watched])];
      if (symbols.length === 0) return { items: [], symbols: [] };
      return { items: await getNewsFor(symbols), symbols };
    }

    return { items: await getGeneralNews(), symbols: [] };
  });
}
