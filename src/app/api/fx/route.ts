import { handle } from '@/lib/api';
import { getFx } from '@/lib/market';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(getFx);
}
