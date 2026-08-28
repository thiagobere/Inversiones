'use client';

import { use, useState } from 'react';
import { PriceChart } from '@/components/charts';
import { Badge, Card, Delta, Disclaimer, Empty, ErrorNote, Loading, Stat } from '@/components/ui';
import { ASSET_CLASS_LABEL, fmtCompact, fmtMoney, fmtNum, fmtPct, fmtRelative } from '@/lib/format';
import { mutate, useApi } from '@/lib/useApi';
import type { HistoryResponse } from '@/lib/api-types';
import type { Indicators } from '@/lib/analytics/indicators';
import type { AssetClass, NewsItem, Quote } from '@/lib/types';

interface AssetResponse {
  quote: Quote;
  assetClass: AssetClass;
  indicators: Indicators;
  news: NewsItem[];
}

const RANGES = [
  ['1d', '1D'], ['5d', '1S'], ['1mo', '1M'], ['6mo', '6M'], ['1y', '1A'], ['5y', '5A'],
] as const;

export default function AssetPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);
  const decoded = decodeURIComponent(symbol);

  const [range, setRange] = useState<string>('1mo');
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  const asset = useApi<AssetResponse>(`/api/asset/${encodeURIComponent(decoded)}`);
  const history = useApi<HistoryResponse>(`/api/history/${encodeURIComponent(decoded)}?range=${range}`);

  if (asset.loading) return <Loading label={`Cargando ${decoded}`} />;
  if (asset.error) return <ErrorNote message={`No se pudo cargar ${decoded}: ${asset.error}`} />;

  const { quote: q, indicators: ind, news } = asset.data!;
  const candles = history.data?.candles ?? [];
  const periodUp = candles.length > 1 ? candles.at(-1)!.c >= candles[0].c : q.changePct >= 0;
  const periodPct = candles.length > 1 ? ((candles.at(-1)!.c - candles[0].c) / candles[0].c) * 100 : null;

  async function addToWatchlist() {
    try {
      await mutate('/api/watchlist', 'POST', { symbol: decoded, name: q.name });
      setWatchMsg('Agregado a seguimiento.');
    } catch (err) {
      setWatchMsg((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2.5">
            <h1 className="serif text-3xl tracking-tight">{q.symbol}</h1>
            <Badge>{ASSET_CLASS_LABEL[asset.data!.assetClass] ?? asset.data!.assetClass}</Badge>
            {q.stale && <Badge tone="warn">Dato en caché</Badge>}
          </div>
          <p className="text-sm text-text-dim">{q.name}</p>
        </div>
        <div className="text-right">
          <p className="tnum text-3xl leading-none text-text">{fmtMoney(q.price, q.currency)}</p>
          <p className="mt-2"><Delta value={q.change} pct={q.changePct} /></p>
          <p className="label mt-2">{fmtRelative(q.fetchedAt)}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={addToWatchlist}
          className="label border border-accent-dim px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-bg">
          Seguir este activo
        </button>
        {watchMsg && <span className="text-xs text-text-dim">{watchMsg}</span>}
      </div>

      <Card
        title={`Precio · ${RANGES.find(([v]) => v === range)?.[1] ?? range}`}
        action={
          <div className="flex border border-hairline">
            {RANGES.map(([value, label]) => (
              <button key={value} onClick={() => setRange(value)}
                className={`label px-2.5 py-1.5 transition-colors ${
                  range === value ? 'bg-surface-2 text-accent' : 'text-text-dim hover:text-text'
                }`}>
                {label}
              </button>
            ))}
          </div>
        }
      >
        {periodPct !== null && (
          <p className="mb-3 text-sm text-text-dim">
            En el período: <Delta pct={periodPct} size="sm" />
          </p>
        )}
        {history.loading ? <Loading /> : history.error ? <ErrorNote message={history.error} />
          : <PriceChart candles={candles} up={periodUp} intraday={range === '1d' || range === '5d'} />}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card title="Datos del día">
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Máximo" value={<span className="text-lg">{fmtMoney(q.dayHigh, q.currency)}</span>} />
            <Stat label="Mínimo" value={<span className="text-lg">{fmtMoney(q.dayLow, q.currency)}</span>} />
            <Stat label="Cierre previo" value={<span className="text-lg">{fmtMoney(q.previousClose, q.currency)}</span>} />
            <Stat label="Volumen" value={<span className="text-lg">{fmtCompact(q.volume)}</span>} />
            <Stat
              label={asset.data!.assetClass === 'crypto' ? 'Máx. histórico' : 'Máx. 52 sem.'}
              value={<span className="text-lg">{fmtMoney(q.fiftyTwoWeekHigh, q.currency)}</span>}
            />
            <Stat
              label={asset.data!.assetClass === 'crypto' ? 'Mín. histórico' : 'Mín. 52 sem.'}
              value={<span className="text-lg">{fmtMoney(q.fiftyTwoWeekLow, q.currency)}</span>}
            />
          </div>
        </Card>

        <Card title="Indicadores">
          <dl className="space-y-3.5 text-sm">
            {[
              ['RSI 14', ind.rsi14 === null ? '—' : fmtNum(ind.rsi14, 1),
                ind.rsi14 === null ? '' : ind.rsi14 >= 70 ? 'sobrecomprado' : ind.rsi14 <= 30 ? 'sobrevendido' : 'zona neutral'],
              ['SMA 20', fmtMoney(ind.sma20, q.currency), ''],
              ['SMA 50', fmtMoney(ind.sma50, q.currency), ''],
              ['SMA 200', fmtMoney(ind.sma200, q.currency), ''],
              ['Volatilidad 30d', ind.volatility30 === null ? '—' : `${fmtNum(ind.volatility30, 0)}%`, 'anualizada'],
              ['Desde el máximo del año', fmtPct(ind.drawdownFromHigh), ''],
            ].map(([label, value, hint]) => (
              <div key={label} className="flex items-baseline gap-3 border-b border-hairline/60 pb-3 last:border-0 last:pb-0">
                <dt className="text-text-dim">{label}</dt>
                <dd className="tnum ml-auto text-text">{value}</dd>
                {hint && <dd className="w-28 text-right text-xs text-text-faint">{hint}</dd>}
              </div>
            ))}
          </dl>
          <p className="mt-4 border-t border-hairline pt-3 text-xs text-text-faint">
            Calculados sobre los cierres del último año. Las medias en blanco necesitan más historial
            del disponible para este activo.
          </p>
        </Card>
      </div>

      <Card title="Noticias">
        {news.length === 0 ? (
          <Empty title="Sin titulares recientes para este activo." />
        ) : (
          <ul className="divide-y divide-hairline">
            {news.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <a href={item.link} target="_blank" rel="noopener noreferrer" className="group block">
                  <p className="text-sm leading-snug text-text group-hover:text-accent">{item.title}</p>
                  <p className="label mt-1.5">{item.publisher} · {fmtRelative(item.publishedAt)}</p>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Disclaimer />
    </div>
  );
}
