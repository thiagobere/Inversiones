'use client';

import { useState } from 'react';
import { AllocationBar, WeightBars } from '@/components/charts';
import PositionsTable from '@/components/PositionsTable';
import SignalList from '@/components/SignalList';
import SymbolSearch from '@/components/SymbolSearch';
import TransactionForm from '@/components/TransactionForm';
import AiAnalysis from '@/components/AiAnalysis';
import { Card, Delta, Disclaimer, Empty, ErrorNote, Loading, Stat } from '@/components/ui';
import { ASSET_CLASS_LABEL, fmtArs, fmtDate, fmtNum, fmtUsd } from '@/lib/format';
import { mutate, useApi } from '@/lib/useApi';
import type { PortfolioResponse, SignalsResponse } from '@/lib/api-types';

export default function PortfolioPage() {
  const portfolio = useApi<PortfolioResponse>('/api/portfolio');
  const signals = useApi<SignalsResponse>('/api/insights');
  const [prefill, setPrefill] = useState<{ symbol: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function removeTransaction(id: number) {
    setBusy(true);
    setError(null);
    try {
      await mutate(`/api/portfolio?id=${id}`, 'DELETE');
      portfolio.reload();
      signals.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (portfolio.loading) return <Loading label="Cargando portafolio" />;
  if (portfolio.error) return <ErrorNote message={portfolio.error} />;

  const p = portfolio.data!;
  const c = p.concentration;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="serif text-3xl tracking-tight">Portafolio</h1>
        <p className="mt-1.5 text-sm text-text-dim">
          El costo promedio se deriva de tus transacciones, no se edita a mano.
        </p>
      </header>

      {error && <ErrorNote message={error} />}

      <Card title="Registrar operación">
        <div className="space-y-4">
          <SymbolSearch onPick={(symbol, name) => setPrefill({ symbol, name })} />
          {prefill && (
            <TransactionForm
              symbol={prefill.symbol}
              name={prefill.name}
              onCancel={() => setPrefill(null)}
              onSaved={() => {
                setPrefill(null);
                portfolio.reload();
                signals.reload();
              }}
            />
          )}
        </div>
      </Card>

      {p.positions.length === 0 ? (
        <Card><Empty title="Sin posiciones abiertas" hint="Buscá un ticker arriba y registrá tu primera compra." /></Card>
      ) : (
        <>
          <Card>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Valor de mercado" value={fmtUsd(p.totals.marketValueUsd)} accent
                sub={p.totals.valueArsMep ? `${fmtArs(p.totals.valueArsMep)} al MEP` : undefined} />
              <Stat label="Costo invertido" value={fmtUsd(p.totals.costBasisUsd)} />
              <Stat label="No realizado" value={<Delta value={p.totals.unrealizedPnlUsd} size="lg" />}
                sub={`${p.totals.unrealizedPnlPct >= 0 ? '+' : ''}${p.totals.unrealizedPnlPct.toFixed(2)}% sobre el costo`} />
              <Stat label="Realizado" value={fmtUsd(p.totals.realizedPnlUsd)} sub="Cerrado con ventas" />
            </div>
          </Card>

          <Card title="Posiciones"><PositionsTable positions={p.positions} /></Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Composición por clase de activo">
              <AllocationBar slices={c.byAssetClass} />
              {c.byCurrency.length > 1 && (
                <p className="mt-5 border-t border-hairline pt-4 text-sm text-text-dim">
                  Por moneda: {c.byCurrency.map((x) => `${x.key} ${x.weight.toFixed(0)}%`).join(' · ')}
                </p>
              )}
            </Card>

            <Card title="Peso de cada posición">
              <WeightBars rows={p.positions.map((x) => ({ symbol: x.symbol, weight: x.weight, valueUsd: x.marketValueUsd }))} />
              <p className="mt-4 border-t border-hairline pt-4 text-sm text-text-dim">
                Posiciones efectivas: <span className="tnum text-text">{fmtNum(c.effectivePositions, 1)}</span> sobre {p.positions.length} reales.
                <span className="mt-1 block text-xs text-text-faint">1 / HHI de los pesos. Cuanto más baja, más concentrada está la cartera.</span>
              </p>
            </Card>
          </div>

          <Card title="Señales calculadas">
            {signals.loading ? <Loading /> : <SignalList signals={signals.data?.signals ?? []} />}
          </Card>

          <AiAnalysis />
        </>
      )}

      <Card title="Transacciones">
        {p.transactions.length === 0 ? (
          <Empty title="Sin transacciones registradas" />
        ) : (
          <>
            {/* Phone: one stacked entry per operation instead of a 640px table. */}
            <ul className="md:hidden">
              {[...p.transactions].reverse().map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 border-b border-hairline/60 py-3.5 first:pt-0 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="tnum text-text">
                      {t.symbol}{' '}
                      <span className={t.type === 'buy' ? 'text-up' : 'text-down'}>
                        {t.type === 'buy' ? 'compra' : 'venta'}
                      </span>
                    </p>
                    <p className="tnum mt-1 text-xs text-text-faint">
                      {fmtDate(t.executed_at)}
                      {t.fees > 0 && <> · comisión {fmtNum(t.fees, 2)}</>}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tnum text-text-dim">{fmtNum(t.quantity, 4)} × {fmtNum(t.price, 2)}</p>
                    <button disabled={busy} onClick={() => removeTransaction(t.id)}
                      className="label mt-1 text-text-faint transition-colors hover:text-down disabled:opacity-40">
                      Borrar
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="-mx-5 hidden overflow-x-auto px-5 md:block">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  {['Fecha', 'Activo', 'Tipo', 'Cantidad', 'Precio', 'Comisión'].map((h, i) => (
                    <th key={h} className={`label pb-3 ${i < 3 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                  <th className="pb-3" />
                </tr>
              </thead>
              <tbody>
                {[...p.transactions].reverse().map((t) => (
                  <tr key={t.id} className="border-b border-hairline/60 hover:bg-surface-2">
                    <td className="tnum py-3 text-text-dim">{fmtDate(t.executed_at)}</td>
                    <td className="tnum py-3 pr-4 text-text">{t.symbol}</td>
                    <td className={`py-3 pr-4 ${t.type === 'buy' ? 'text-up' : 'text-down'}`}>
                      {t.type === 'buy' ? 'Compra' : 'Venta'}
                    </td>
                    <td className="tnum py-3 text-right text-text-dim">{fmtNum(t.quantity, 4)}</td>
                    <td className="tnum py-3 text-right text-text-dim">{fmtNum(t.price, 2)} {t.currency}</td>
                    <td className="tnum py-3 text-right text-text-faint">{fmtNum(t.fees, 2)}</td>
                    <td className="py-3 pl-4 text-right">
                      <button disabled={busy} onClick={() => removeTransaction(t.id)}
                        className="label text-text-faint transition-colors hover:text-down disabled:opacity-40">
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <p className="text-xs text-text-faint">
        Clases: {Object.values(ASSET_CLASS_LABEL).join(' · ')}. Los activos en pesos se convierten a
        dólares al CCL; el total en pesos usa el MEP.
      </p>
      <Disclaimer />
    </div>
  );
}
