import { getDb } from '@/lib/db';

interface CacheRow {
  payload: string;
  fetched_at: number;
}

export function readCache<T>(key: string, ttlMs: number): { value: T; stale: boolean } | null {
  const row = getDb()
    .prepare('SELECT payload, fetched_at FROM quote_cache WHERE key = ?')
    .get(key) as CacheRow | undefined;
  if (!row) return null;
  return { value: JSON.parse(row.payload) as T, stale: Date.now() - row.fetched_at > ttlMs };
}

export function writeCache(key: string, value: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO quote_cache (key, payload, fetched_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at`,
    )
    .run(key, JSON.stringify(value), Date.now());
}

/**
 * Fresh cache hit -> return it. Otherwise fetch.
 * If the fetch throws, fall back to a stale cache entry rather than failing the
 * whole page: a labelled old number beats a blank screen on a dashboard.
 */
export async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<{ value: T; stale: boolean }> {
  const hit = readCache<T>(key, ttlMs);
  if (hit && !hit.stale) return { value: hit.value, stale: false };

  try {
    const value = await fetcher();
    writeCache(key, value);
    return { value, stale: false };
  } catch (err) {
    if (hit) {
      console.warn(`[cache] ${key}: provider failed, serving stale copy —`, err);
      return { value: hit.value, stale: true };
    }
    throw err;
  }
}
