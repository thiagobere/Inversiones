import { handle } from '@/lib/api';
import * as repo from '@/lib/repo';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(() => ({ snapshots: repo.listSnapshots() }));
}
