import { handle } from '@/lib/api';
import { getQuotes } from '@/lib/market';
import { evaluateAlerts } from '@/lib/services/alerts';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => {
    const symbols = new URL(request.url).searchParams.get('symbols');
    if (!symbols) return { quotes: {}, triggered: [] };

    const [quotes, triggered] = await Promise.all([
      getQuotes(symbols.split(',').filter(Boolean)),
      // Alerts have no background worker; a quote refresh is when they get checked.
      evaluateAlerts(),
    ]);
    return { quotes, triggered };
  });
}
