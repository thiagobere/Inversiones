'use client';

import Link from 'next/link';
import { useState } from 'react';
import SymbolSearch from '@/components/SymbolSearch';
import { Badge, Card, Empty, ErrorNote, Loading } from '@/components/ui';
import { fmtDate, fmtNum } from '@/lib/format';
import { mutate, useApi } from '@/lib/useApi';
import type { AlertsResponse } from '@/lib/api-types';
import type { Alert } from '@/lib/types';

const KIND_LABEL: Record<Alert['kind'], string> = {
  price_above: 'Precio por encima de',
  price_below: 'Precio por debajo de',
  pct_change_above: 'Variación diaria mayor a',
  pct_change_below: 'Variación diaria menor a',
};

const FIELD = 'w-full border border-hairline bg-bg px-3 py-2.5 text-sm text-text focus:border-accent-dim focus:outline-none';

export default function AlertsPage() {
  const alerts = useApi<AlertsResponse>('/api/alerts');
  const [symbol, setSymbol] = useState('');
  const [kind, setKind] = useState<Alert['kind']>('price_below');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function change(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      alerts.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!symbol) {
      setError('Elegí un activo primero.');
      return;
    }
    await change(async () => {
      await mutate('/api/alerts', 'POST', { symbol, kind, threshold: Number(threshold), note });
      setThreshold('');
      setNote('');
      setSymbol('');
    });
  }

  const rows = alerts.data?.alerts ?? [];
  const active = rows.filter((a) => a.active === 1);
  const done = rows.filter((a) => a.active === 0);
  const isPct = kind.startsWith('pct_change');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="serif text-3xl tracking-tight">Alertas</h1>
        <p className="mt-1.5 text-sm text-text-dim">
          Se evalúan cada vez que se refrescan los precios, mientras tengas la app abierta.
        </p>
      </header>

      {error && <ErrorNote message={error} />}
      {(alerts.data?.triggered.length ?? 0) > 0 && (
        <div className="border border-warn/40 bg-warn/5 px-4 py-3 text-sm text-warn">
          Se dispararon {alerts.data!.triggered.length} alerta(s):{' '}
          {alerts.data!.triggered.map((a) => a.symbol).join(', ')}.
        </div>
      )}

      <Card title="Nueva alerta">
        <form onSubmit={create} className="space-y-4">
          {symbol ? (
            <div className="flex items-baseline gap-3">
              <span className="tnum text-text">{symbol}</span>
              <button type="button" onClick={() => setSymbol('')} className="label text-text-faint hover:text-text">
                Cambiar
              </button>
            </div>
          ) : (
            <SymbolSearch placeholder="Elegí el activo…" onPick={(s) => setSymbol(s)} />
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="label mb-1.5 block">Condición</span>
              <select value={kind} onChange={(e) => setKind(e.target.value as Alert['kind'])} className={FIELD}>
                {Object.entries(KIND_LABEL).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1.5 block">{isPct ? 'Porcentaje' : 'Valor'}</span>
              <input required type="number" step="any" value={threshold}
                onChange={(e) => setThreshold(e.target.value)} className={`${FIELD} tnum`}
                placeholder={isPct ? '-5' : '150'} />
            </label>
          </div>

          <label className="block">
            <span className="label mb-1.5 block">Nota (opcional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={FIELD}
              placeholder="Por qué me importa este nivel" />
          </label>

          <button type="submit" disabled={busy}
            className="label border border-accent-dim px-4 py-2.5 text-accent transition-colors hover:bg-accent hover:text-bg disabled:opacity-40">
            Crear alerta
          </button>
        </form>
      </Card>

      <Card title={`Activas (${active.length})`}>
        {alerts.loading ? (
          <Loading />
        ) : active.length === 0 ? (
          <Empty title="No tenés alertas activas" />
        ) : (
          <ul className="divide-y divide-hairline">
            {active.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5 first:pt-0">
                <Link href={`/asset/${encodeURIComponent(a.symbol)}`} className="tnum text-text hover:text-accent">
                  {a.symbol}
                </Link>
                <span className="text-sm text-text-dim">
                  {KIND_LABEL[a.kind]} <span className="tnum text-text">{fmtNum(a.threshold)}{a.kind.startsWith('pct') ? '%' : ''}</span>
                </span>
                {a.note && <span className="text-xs text-text-faint">— {a.note}</span>}
                <button disabled={busy} onClick={() => change(() => mutate(`/api/alerts?id=${a.id}`, 'DELETE'))}
                  className="label ml-auto text-text-faint hover:text-down disabled:opacity-40">
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {done.length > 0 && (
        <Card title={`Disparadas (${done.length})`}>
          <ul className="divide-y divide-hairline">
            {done.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5 first:pt-0">
                <Badge tone="warn">Disparada</Badge>
                <Link href={`/asset/${encodeURIComponent(a.symbol)}`} className="tnum text-text hover:text-accent">
                  {a.symbol}
                </Link>
                <span className="text-sm text-text-dim">
                  {KIND_LABEL[a.kind]} <span className="tnum">{fmtNum(a.threshold)}</span>
                  {a.triggered_px !== null && <> · tocó <span className="tnum text-text">{fmtNum(a.triggered_px)}</span></>}
                  {a.triggered_at && <> el {fmtDate(a.triggered_at)}</>}
                </span>
                <span className="ml-auto flex gap-3">
                  <button disabled={busy} onClick={() => change(() => mutate('/api/alerts', 'PATCH', { id: a.id, active: true }))}
                    className="label text-text-faint hover:text-accent disabled:opacity-40">
                    Reactivar
                  </button>
                  <button disabled={busy} onClick={() => change(() => mutate(`/api/alerts?id=${a.id}`, 'DELETE'))}
                    className="label text-text-faint hover:text-down disabled:opacity-40">
                    Borrar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs leading-relaxed text-text-faint">
        No hay proceso en segundo plano: las alertas se chequean cuando la app pide precios. Si la
        cerrás, no se evalúan hasta que la vuelvas a abrir.
      </p>
    </div>
  );
}
