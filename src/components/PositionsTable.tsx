'use client';

import Link from 'next/link';
import { ASSET_CLASS_LABEL, fmtMoney, fmtNum, fmtPct, fmtUsd } from '@/lib/format';
import type { Position } from '@/lib/types';
import { Delta } from '@/components/ui';

export default function PositionsTable({
  positions, onRemove,
}: {
  positions: Position[];
  onRemove?: (symbol: string) => void;
}) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline">
            {['Activo', 'Cant.', 'Costo prom.', 'Precio', 'Valor USD', 'Día', 'No realizado', 'Peso'].map((h, i) => (
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
  );
}
