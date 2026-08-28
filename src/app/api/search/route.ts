import { handle } from '@/lib/api';
import { search } from '@/lib/market';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const q = new URL(request.url).searchParams.get('q')?.trim();
    if (!q || q.length < 1) return { results: [] };
    return { results: await search(q) };
  });
}
