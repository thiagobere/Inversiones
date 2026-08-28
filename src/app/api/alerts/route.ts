import { z } from 'zod';
import { fail, handle } from '@/lib/api';
import * as repo from '@/lib/repo';
import { evaluateAlerts } from '@/lib/services/alerts';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => {
    const triggered = await evaluateAlerts();
    return { alerts: repo.listAlerts(), triggered };
  });
}

const alertSchema = z.object({
  symbol: z.string().min(1),
  kind: z.enum(['price_above', 'price_below', 'pct_change_above', 'pct_change_below']),
  threshold: z.number().finite(),
  note: z.string().optional(),
});

export async function POST(request: Request) {
  return handle(async () => repo.addAlert(alertSchema.parse(await request.json())));
}

const patchSchema = z.object({ id: z.number().int(), active: z.boolean() });

export async function PATCH(request: Request) {
  return handle(async () => {
    const { id, active } = patchSchema.parse(await request.json());
    if (!repo.setAlertActive(id, active)) throw new Error('No existe esa alerta');
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get('id'));
  if (!Number.isInteger(id)) return fail('id inválido', 422);
  return handle(() => {
    if (!repo.deleteAlert(id)) throw new Error('No existe esa alerta');
    return { ok: true };
  });
}
