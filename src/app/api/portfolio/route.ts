import { z } from 'zod';
import { fail, handle } from '@/lib/api';
import * as repo from '@/lib/repo';
import { buildPortfolio, snapshotToday } from '@/lib/services/portfolio';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const view = await buildPortfolio();
    snapshotToday(view);
    return { ...view, transactions: repo.listTransactions() };
  });
}

const transactionSchema = z.object({
  symbol: z.string().min(1, 'requerido'),
  name: z.string().optional(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive('debe ser mayor a 0'),
  price: z.number().nonnegative('no puede ser negativo'),
  fees: z.number().nonnegative().optional(),
  executed_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'formato AAAA-MM-DD').optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  return handle(async () => repo.addTransaction(transactionSchema.parse(await request.json())));
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return fail('id inválido', 422);
  return handle(() => {
    if (!repo.deleteTransaction(id)) throw new Error('No existe esa transacción');
    return { ok: true };
  });
}
