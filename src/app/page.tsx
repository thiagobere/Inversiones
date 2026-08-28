'use client';

import Link from 'next/link';
import { useApi } from '@/lib/useApi';
import type { NewsResponse, PortfolioResponse, SignalsResponse, SnapshotsResponse } from '@/lib/api-types';
import { AllocationBar, EvolutionChart } from '@/components/charts';
import PositionsTable from '@/components/PositionsTable';
import SignalList from '@/components/SignalList';
import { Card, Delta, Disclaimer, Empty, ErrorNote, Loading, Stat } from '@/components/ui';
import { fmtArs, fmtNum, fmtRelative, fmtUsd } from '@/lib/format';

export default function DashboardPage() {
  const portfolio = useApi<PortfolioResponse>('/api/portfolio');
  const snapshots = useApi<SnapshotsResponse>('/api/snapshots');
  const signals = useApi<SignalsResponse>('/api/insights');
  const news = useApi<NewsResponse>('/api/news?scope=portfolio');

  if (portfolio.loading) return <Loading label="Cargando portafolio" />;
  if (portfolio.error) return <ErrorNote message={portfolio.error} />;

  const p = portfolio.data;
  const empty = !p || p.positions.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="serif text-3xl tracking-tight">Resumen</h1>
          <p className="mt-1.5 text-sm text-text-dim">
            {p?.fx.ccl
              ? `CCL ${fmtNum(p.fx.ccl, 0)} · MEP ${fmtNum(p.fx.mep, 0)} · ${fmtRelative(p.fx.fetchedAt)}`
              : 'Cotización del dólar no disponible'}
          </p>
        </div>
        {p?.unpriced.length ? (
          <p className="text-xs text-warn">Sin precio ahora: {p.unpriced.join(', ')}</p>
        ) : null}
      </header>

      {empty ? (
        <Card>
          <Empty
            title="Todavía no cargaste ninguna posición"
            hint="Agregá tu primera compra en Portafolio y el resumen se arma solo: valuación, P&L, composición, noticias y señales."
          />
          <div className="text-center">
            <Link href="/portfolio" className="label border border-accent-dim px-4 py-2.5 text-accent transition-colors hover:bg-accent hover:text-bg">
              Ir a portafolio
            </Link>
          </div>
        </Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Valor de mercado"
                value={fmtUsd(p.totals.marketValueUsd)}
                accent
                sub={p.totals.valueArsMep ? `${fmtArs(p.totals.valueArsMep)} al MEP` : undefined}
              />
              <Stat label="Costo invertido" value={fmtUsd(p.totals.costBasisUsd)} />
              <Stat
                label="No realizado"
                value={<Delta value={p.totals.unrealizedPnlUsd} size="lg" />}
                sub={`${p.totals.unrealizedPnlPct >= 0 ? '+' : ''}${p.totals.unrealizedPnlPct.toFixed(2)}% sobre el costo`}
              />
              <Stat
                label="Variación del día"
                value={<Delta value={p.totals.dayPnlUsd} size="lg" />}
                sub={p.totals.realizedPnlUsd !== 0 ? `Realizado: ${fmtUsd(p.totals.realizedPnlUsd)}` : undefined}
              />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Evolución del portafolio" className="lg:col-span-2">
              {snapshots.loading ? <Loading /> : <EvolutionChart snapshots={snapshots.data?.snapshots ?? []} />}
            </Card>
            <Card title="Composición">
              <AllocationBar slices={p.concentration.byAssetClass} />
            </Card>
          </div>

          <Card title="Posiciones" action={<Link href="/portfolio" className="label text-accent hover:underline">Ver todo</Link>}>
            <PositionsTable positions={p.positions.slice(0, 6)} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Señales" action={<Link href="/portfolio" className="label text-accent hover:underline">Detalle</Link>}>
              {signals.loading ? <Loading /> : <SignalList signals={(signals.data?.signals ?? []).slice(0, 4)} />}
            </Card>

            <Card title="Noticias de tus activos" action={<Link href="/news" className="label text-accent hover:underline">Ver todo</Link>}>
              {news.loading ? (
                <Loading />
              ) : (news.data?.items.length ?? 0) === 0 ? (
                <Empty title="Sin noticias recientes para tus activos." />
              ) : (
                <ul className="space-y-4">
                  {news.data?.items.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="group block">
                        <p className="text-sm leading-snug text-text group-hover:text-accent">{item.title}</p>
                        <p className="label mt-1.5">
                          {item.symbols.join(' · ')} — {item.publisher} · {fmtRelative(item.publishedAt)}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Disclaimer />
        </>
      )}
    </div>
  );
}
