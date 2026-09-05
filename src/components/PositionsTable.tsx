'use client';

import Link from 'next/link';
import { ASSET_CLASS_LABEL, fmtMoney, fmtNum, fmtPct, fmtUsd } from '@/lib/format';
import type { Position } from '@/lib/types';
import { Delta } from '@/components/ui';

const HEADS = ['Activo', 'Cant.', 'Costo prom.', 'Precio', 'Valor USD', 'Día', 'No realizado', 'Peso'];

/**
 * Two layouts, one dataset. Below `md` the columns would need an 860px
 * scroller on a phone, so the same rows are stacked instead; the table
 * itself only appears once there is room for it.
 */
export default function PositionsTable({
  positions, onRemove,
}: {
  positions: Position[];
  onRemove?: (symbol: string) => void;
}) {
  return (
    <>
      <ul className="md:hidden">
        {positions.map((p) => (
          <li key={p.symbol} className="border-b border-hairline/60 py-4 first:pt-0 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="group min-w-0 flex-1">
                <span className="tnum block text-text group-hover:text-accent">{p.symbol}</span>
                <span className="mt-0.5 block truncate text-xs text-text-faint">
                  {ASSET_CLASS_LABEL[p.assetClass] ?? p.assetClass} · {p.name}
                </span>
              </Link>
              <div className="shrink-0 text-right">
                <span className="tnum block text-text">{fmtUsd(p.marketValueUsd)}</span>
                <span className="mt-1 block"><Delta pct={p.unrealizedPnlPct} size="sm" /></span>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              {[
                ['Cantidad', fmtNum(p.quantity, 4)],
                ['Costo prom.', fmtMoney(p.avgCost, p.currency)],
                ['Precio', fmtMoney(p.price, p.currency)],
                ['Peso', `${p.weight.toFixed(1)}%`],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="label">{k}</dt>
                  <dd className="tnum mt-1.5 truncate text-text-dim">{v}</dd>
                </div>
              ))}
              <div className="min-w-0">
                <dt className="label">Día</dt>
                <dd className="mt-1.5"><Delta pct={p.dayChangePct} size="sm" /></dd>
              </div>
              <div className="min-w-0">
                <dt className="label">No realizado</dt>
                <dd className="mt-1.5"><Delta value={p.unrealizedPnlUsd} size="sm" /></dd>
              </div>
            </dl>

            {onRemove && (
              <button
                onClick={() => onRemove(p.symbol)}
                className="label mt-3 text-text-faint transition-colors hover:text-down"
              >
                Quitar {p.symbol}
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="-mx-5 hidden overflow-x-auto px-5 md:block">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-hairline">
              {HEADS.map((h, i) => (
                <th key={h} className={`label pb-3 ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
              {onRemove && <th className="pb-3" />}
            </tr>
          </thead>
          <tbody>
            {positions.map((p) => (
              <tr key={p.symbol} className="border-b border-hairline/60 transition-colors hover:bg-surface-2">
                <td className="py-3.5 pr-4">
                  <Link href={`/asset/${encodeURIComponent(p.symbol)}`} className="group block">
                    <span className="tnum text-text group-hover:text-accent">{p.symbol}</span>
                    <span className="mt-0.5 block max-w-[220px] truncate text-xs text-text-faint">
                      {ASSET_CLASS_LABEL[p.assetClass] ?? p.assetClass} · {p.name}
                    </span>
                  </Link>
                </td>
                <td className="tnum py-3.5 text-right text-text-dim">{fmtNum(p.quantity, 4)}</td>
                <td className="tnum py-3.5 text-right text-text-dim">{fmtMoney(p.avgCost, p.currency)}</td>
                <td className="tnum py-3.5 text-right text-text">{fmtMoney(p.price, p.currency)}</td>
                <td className="tnum py-3.5 text-right text-text">{fmtUsd(p.marketValueUsd)}</td>
                <td className="py-3.5 text-right"><Delta pct={p.dayChangePct} size="sm" /></td>
                <td className="py-3.5 text-right">
                  <Delta value={p.unrealizedPnlUsd} size="sm" />
                  <span className="tnum mt-0.5 block text-xs text-text-faint">{fmtPct(p.unrealizedPnlPct)}</span>
                </td>
                <td className="tnum py-3.5 text-right text-text-dim">{p.weight.toFixed(1)}%</td>
                {onRemove && (
                  <td className="py-3.5 pl-4 text-right">
                    <button
                      onClick={() => onRemove(p.symbol)}
                      className="label text-text-faint transition-colors hover:text-down"
                      aria-label={`Quitar ${p.symbol}`}
                    >
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
