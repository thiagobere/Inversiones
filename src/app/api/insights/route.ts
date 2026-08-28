import { handle } from '@/lib/api';
import { buildPortfolio } from '@/lib/services/portfolio';
import { buildSignals } from '@/lib/services/signals';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const view = await buildPortfolio();
    return { signals: await buildSignals(view) };
  });
}
