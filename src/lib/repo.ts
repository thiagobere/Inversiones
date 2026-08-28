import { getDb } from '@/lib/db';
import { classify, normalizeSymbol } from '@/lib/market/symbols';
import type { Alert, Asset, Transaction } from '@/lib/types';

/** Ensures the asset row exists so transactions/watchlist/alerts can reference it. */
export function upsertAsset(symbol: string, name?: string): Asset {
  const s = normalizeSymbol(symbol);
  const { assetClass, provider, currency } = classify(s);

  getDb()
    .prepare(
      `INSERT INTO assets (symbol, name, asset_class, currency, provider)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(symbol) DO UPDATE SET name = COALESCE(NULLIF(excluded.name, ''), assets.name)`,
    )
    .run(s, name ?? '', assetClass, currency, provider);

  return getDb().prepare('SELECT * FROM assets WHERE symbol = ?').get(s) as Asset;
}

export function listAssets(): Asset[] {
  return getDb().prepare('SELECT * FROM assets ORDER BY symbol').all() as Asset[];
}

export function getAsset(symbol: string): Asset | undefined {
  return getDb().prepare('SELECT * FROM assets WHERE symbol = ?').get(normalizeSymbol(symbol)) as
    | Asset
    | undefined;
}

// ---------- transactions ----------

export function listTransactions(symbol?: string): Transaction[] {
  const db = getDb();
  return (
    symbol
      ? db
          .prepare('SELECT * FROM transactions WHERE symbol = ? ORDER BY executed_at, id')
          .all(normalizeSymbol(symbol))
      : db.prepare('SELECT * FROM transactions ORDER BY executed_at, id').all()
  ) as Transaction[];
}

export interface NewTransaction {
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees?: number;
  executed_at?: string;
  notes?: string;
  name?: string;
}

export function addTransaction(input: NewTransaction): Transaction {
  const asset = upsertAsset(input.symbol, input.name);
  const info = getDb()
    .prepare(
      `INSERT INTO transactions (symbol, type, quantity, price, fees, currency, executed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      asset.symbol,
      input.type,
      input.quantity,
      input.price,
      input.fees ?? 0,
      asset.currency,
      input.executed_at ?? new Date().toISOString().slice(0, 10),
      input.notes ?? '',
    );

  return getDb()
    .prepare('SELECT * FROM transactions WHERE id = ?')
    .get(info.lastInsertRowid) as Transaction;
}

export function deleteTransaction(id: number): boolean {
  return getDb().prepare('DELETE FROM transactions WHERE id = ?').run(id).changes > 0;
}

// ---------- watchlist ----------

export function listWatchlist(): string[] {
  const rows = getDb()
    .prepare('SELECT symbol FROM watchlist ORDER BY sort_order, symbol')
    .all() as { symbol: string }[];
  return rows.map((r) => r.symbol);
}

export function addToWatchlist(symbol: string, name?: string): string {
  const asset = upsertAsset(symbol, name);
  getDb()
    .prepare('INSERT INTO watchlist (symbol) VALUES (?) ON CONFLICT(symbol) DO NOTHING')
    .run(asset.symbol);
  return asset.symbol;
}

export function removeFromWatchlist(symbol: string): boolean {
  return (
    getDb().prepare('DELETE FROM watchlist WHERE symbol = ?').run(normalizeSymbol(symbol)).changes > 0
  );
}

// ---------- alerts ----------

export function listAlerts(): Alert[] {
  return getDb().prepare('SELECT * FROM alerts ORDER BY active DESC, created_at DESC').all() as Alert[];
}

export interface NewAlert {
  symbol: string;
  kind: Alert['kind'];
  threshold: number;
  note?: string;
}

export function addAlert(input: NewAlert): Alert {
  const asset = upsertAsset(input.symbol);
  const info = getDb()
    .prepare('INSERT INTO alerts (symbol, kind, threshold, note) VALUES (?, ?, ?, ?)')
    .run(asset.symbol, input.kind, input.threshold, input.note ?? '');
  return getDb().prepare('SELECT * FROM alerts WHERE id = ?').get(info.lastInsertRowid) as Alert;
}

export function deleteAlert(id: number): boolean {
  return getDb().prepare('DELETE FROM alerts WHERE id = ?').run(id).changes > 0;
}

export function setAlertActive(id: number, active: boolean): boolean {
  return (
    getDb()
      .prepare('UPDATE alerts SET active = ?, triggered_at = NULL, triggered_px = NULL WHERE id = ?')
      .run(active ? 1 : 0, id).changes > 0
  );
}

export function markAlertTriggered(id: number, price: number): void {
  getDb()
    .prepare("UPDATE alerts SET active = 0, triggered_at = datetime('now'), triggered_px = ? WHERE id = ?")
    .run(price, id);
}

// ---------- snapshots ----------

export interface Snapshot {
  date: string;
  total_value_usd: number;
  total_cost_usd: number;
  fx_mep: number | null;
  fx_ccl: number | null;
}

export function listSnapshots(limit = 400): Snapshot[] {
  return getDb()
    .prepare('SELECT * FROM portfolio_snapshots ORDER BY date DESC LIMIT ?')
    .all(limit)
    .reverse() as Snapshot[];
}

/** One row per calendar day; re-running during the day refreshes today's value. */
export function recordSnapshot(s: Snapshot): void {
  getDb()
    .prepare(
      `INSERT INTO portfolio_snapshots (date, total_value_usd, total_cost_usd, fx_mep, fx_ccl)
       VALUES (@date, @total_value_usd, @total_cost_usd, @fx_mep, @fx_ccl)
       ON CONFLICT(date) DO UPDATE SET
         total_value_usd = excluded.total_value_usd,
         total_cost_usd  = excluded.total_cost_usd,
         fx_mep          = excluded.fx_mep,
         fx_ccl          = excluded.fx_ccl`,
    )
    .run(s);
}
