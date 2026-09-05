'use client';

import Link from 'next/link';
import { useState } from 'react';
import SymbolSearch from '@/components/SymbolSearch';
import { Card, Delta, Empty, ErrorNote, Loading } from '@/components/ui';
import { fmtCompact, fmtMoney, fmtRelative } from '@/lib/format';
import { mutate, useApi } from '@/lib/useApi';
import type { WatchlistResponse } from '@/lib/api-types';

export default function WatchlistPage() {
  const watchlist = useApi<WatchlistResponse>('/api/watchlist');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      watchlist.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const symbols = watchlist.data?.symbols ?? [];
  const quotes = watchlist.data?.quotes ?? {};

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="serif text-3xl tracking-tight">Seguimiento</h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Activos que mirás sin tenerlos. También alimentan el feed de noticias.
        </p>
      </header>

      {error && <ErrorNote message={error} />}

      <Card title="Agregar activo">
        <SymbolSearch
          placeholder="Buscar y agregar a seguimiento…"
          onPick={(symbol, name) => change(() => mutate('/api/watchlist', 'POST', { symbol, name }))}
        />
      </Card>

      <Card title="Lista">
        {watchlist.loading ? (
          <Loading />
        ) : symbols.length === 0 ? (
          <Empty title="Tu lista está vacía" hint="Buscá un ticker arriba para empezar a seguirlo." />
        ) : (
          <>
            {/* Phone: stacked rows. The five-column table needs 640px and
                would otherwise force the page to scroll sideways. */}
            <ul className="md:hidden">
              {symbols.map((symbol) => {
                const q = quotes[symbol];
                return (
                  <li key={symbol} className="border-b border-hairline/60 py-4 first:pt-0 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/asset/${encodeURIComponent(symbol)}`} className="group min-w-0 flex-1">
                        <span className="tnum block text-text group-hover:text-accent">{symbol}</span>
                        <span className="mt-0.5 block truncate text-xs text-text-faint">
                          {q?.name ?? 'Sin datos ahora'}
                        </span>
                      </Link>
                      <div className="shrink-0 text-right">
                        <span className="tnum block text-text">{fmtMoney(q?.price ?? null, q?.currency ?? 'USD')}</span>
                        <span className="mt-1 block"><Delta pct={q?.changePct ?? null} size="sm" /></span>
                      </div>
                    </div>
                    <div className="mt-3 flex items-baseline justify-between gap-3 text-xs">
                      <span className="text-text-faint">
                        {q?.fiftyTwoWeekLow != null && q?.fiftyTwoWeekHigh != null
                          ? <>52 sem. <span className="tnum">{fmtCompact(q.fiftyTwoWeekLow)} – {fmtCompact(q.fiftyTwoWeekHigh)}</span></>
                          : 'Rango 52 sem. no disponible'}
                      </span>
                      <button disabled={busy}
                        onClick={() => change(() => mutate(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, 'DELETE'))}
                        className="label text-text-faint transition-colors hover:text-down disabled:opacity-40">
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="-mx-5 hidden overflow-x-auto px-5 md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  {['Activo', 'Precio', 'Día', 'Rango 52 sem.', 'Volumen'].map((h, i) => (
                    <th key={h} className={`label pb-3 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {symbols.map((symbol) => {
                  const q = quotes[symbol];
                  return (
                    <tr key={symbol} className="border-b border-hairline/60 hover:bg-surface-2">
                      <td className="py-3.5 pr-4">
                        <Link href={`/asset/${encodeURIComponent(symbol)}`} className="group block">
                          <span className="tnum text-text group-hover:text-accent">{symbol}</span>
                          <span className="mt-0.5 block max-w-[240px] truncate text-xs text-text-faint">
                            {q?.name ?? 'Sin datos ahora'}
                          </span>
                        </Link>
                      </td>
                      <td className="tnum py-3.5 text-right text-text">{fmtMoney(q?.price ?? null, q?.currency ?? 'USD')}</td>
                      <td className="py-3.5 text-right"><Delta pct={q?.changePct ?? null} size="sm" /></td>
                      <td className="tnum py-3.5 text-right text-xs text-text-faint">
                        {q?.fiftyTwoWeekLow != null && q?.fiftyTwoWeekHigh != null
                          ? `${fmtCompact(q.fiftyTwoWeekLow)} – ${fmtCompact(q.fiftyTwoWeekHigh)}`
                          : '—'}
                      </td>
                      <td className="tnum py-3.5 text-right text-text-dim">{fmtCompact(q?.volume ?? null)}</td>
                      <td className="py-3.5 pl-4 text-right">
                        <button disabled={busy}
                          onClick={() => change(() => mutate(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, 'DELETE'))}
                          className="label text-text-faint transition-colors hover:text-down disabled:opacity-40">
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        {symbols.length > 0 && (
          <p className="mt-4 border-t border-hairline pt-3 text-xs text-text-faint">
            Precios actualizados {fmtRelative(Object.values(quotes).find(Boolean)?.fetchedAt)}.
          </p>
        )}
      </Card>
    </div>
  );
}
