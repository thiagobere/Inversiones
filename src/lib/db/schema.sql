-- Applied idempotently on first DB access. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS assets (
  symbol      TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  asset_class TEXT NOT NULL CHECK (asset_class IN ('us_equity','ar_equity','cedear','crypto')),
  currency    TEXT NOT NULL DEFAULT 'USD',
  provider    TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Source of truth for cost basis. Positions are derived from these.
CREATE TABLE IF NOT EXISTS transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol      TEXT NOT NULL REFERENCES assets(symbol) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('buy','sell')),
  quantity    REAL NOT NULL CHECK (quantity > 0),
  price       REAL NOT NULL CHECK (price >= 0),
  fees        REAL NOT NULL DEFAULT 0 CHECK (fees >= 0),
  currency    TEXT NOT NULL DEFAULT 'USD',
  executed_at TEXT NOT NULL DEFAULT (datetime('now')),
  notes       TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_tx_symbol ON transactions(symbol, executed_at);

CREATE TABLE IF NOT EXISTS watchlist (
  symbol     TEXT PRIMARY KEY REFERENCES assets(symbol) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alerts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  symbol       TEXT NOT NULL REFERENCES assets(symbol) ON DELETE CASCADE,
  kind         TEXT NOT NULL CHECK (kind IN ('price_above','price_below','pct_change_above','pct_change_below')),
  threshold    REAL NOT NULL,
  note         TEXT NOT NULL DEFAULT '',
  active       INTEGER NOT NULL DEFAULT 1,
  triggered_at TEXT,
  triggered_px REAL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(active, symbol);

-- One row per day: lets us chart real portfolio evolution instead of guessing it.
CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  date            TEXT PRIMARY KEY,
  total_value_usd REAL NOT NULL,
  total_cost_usd  REAL NOT NULL,
  fx_mep          REAL,
  fx_ccl          REAL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Short-TTL cache. Keeps us off the rate limits and lets the UI degrade
-- to a stale-but-labelled number when a provider is down.
CREATE TABLE IF NOT EXISTS quote_cache (
  key        TEXT PRIMARY KEY,
  payload    TEXT NOT NULL,
  fetched_at INTEGER NOT NULL
);
