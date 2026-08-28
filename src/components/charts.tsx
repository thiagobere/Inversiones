'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ASSET_CLASS_LABEL, fmtCompact, fmtPct, fmtUsd } from '@/lib/format';

/**
 * Categorical slots for composition charts. Validated against this app's
 * chart surface (#131517) for the CVD-separation, normal-vision, lightness,
 * chroma and contrast checks — do not re-order or extend without re-validating.
 * Assigned in fixed order so a filter never repaints the surviving series.
 */
const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500'];

const AXIS = { stroke: '#5a6169', fontSize: 11, fontFamily: 'var(--font-jetbrains)' };
const GRID = '#26292d';

function TooltipBox({ rows, title }: { title: string; rows: Array<{ label: string; value: string; color?: string }> }) {
  return (
    <div className="border border-hairline-strong bg-bg px-3 py-2 shadow-lg">
      <p className="label mb-1.5">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-baseline gap-3 text-sm">
          {r.color && <span className="mt-0.5 h-2 w-2 shrink-0" style={{ background: r.color }} />}
          <span className="text-text-dim">{r.label}</span>
          <span className="tnum ml-auto text-text">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- price line

export function PriceChart({
  candles, up, intraday,
}: {
  candles: Array<{ t: number; c: number }>;
  up: boolean;
  intraday: boolean;
}) {
  if (candles.length < 2) {
    return <p className="py-16 text-center text-sm text-text-faint">Sin datos suficientes para graficar.</p>;
  }

  const colour = up ? '#4ade80' : '#f87171';
  const values = candles.map((c) => c.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08 || max * 0.02;

  const fmtTick = (t: number) =>
    new Date(t).toLocaleDateString('es-AR', intraday ? { hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short' });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={candles} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colour} stopOpacity={0.22} />
            <stop offset="100%" stopColor={colour} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="t" tickFormatter={fmtTick} {...AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} />
        <YAxis
          domain={[min - pad, max + pad]}
          tickFormatter={(v: number) => fmtCompact(v)}
          {...AXIS}
          tickLine={false}
          axisLine={false}
          width={56}
        />
        <Tooltip
          cursor={{ stroke: '#5a6169', strokeDasharray: '3 3' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                title={new Date(payload[0].payload.t).toLocaleString('es-AR')}
                rows={[{ label: 'Precio', value: fmtUsd(payload[0].payload.c), color: colour }]}
              />
            ) : null
          }
        />
        <Area type="monotone" dataKey="c" stroke={colour} strokeWidth={2} fill="url(#priceFill)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#0a0b0c' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------- portfolio evolution

export function EvolutionChart({
  snapshots,
}: {
  snapshots: Array<{ date: string; total_value_usd: number; total_cost_usd: number }>;
}) {
  if (snapshots.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-text-faint">
        La evolución se dibuja con un punto por día. Volvé mañana y vas a ver la primera línea.
      </p>
    );
  }

  return (
    <>
      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
        <li className="flex items-center gap-2 text-xs text-text-dim">
          <span className="h-0.5 w-4" style={{ background: '#c9a961' }} /> Valor de mercado
        </li>
        <li className="flex items-center gap-2 text-xs text-text-dim">
          <span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: '#8a9199' }} /> Costo invertido
        </li>
      </ul>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={snapshots} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c9a961" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#c9a961" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
            {...AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40}
          />
          <YAxis tickFormatter={(v: number) => fmtCompact(v)} {...AXIS} tickLine={false} axisLine={false} width={56} />
          <Tooltip
            cursor={{ stroke: '#5a6169', strokeDasharray: '3 3' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={new Date(payload[0].payload.date).toLocaleDateString('es-AR')}
                  rows={[
                    { label: 'Valor', value: fmtUsd(payload[0].payload.total_value_usd), color: '#c9a961' },
                    { label: 'Costo', value: fmtUsd(payload[0].payload.total_cost_usd), color: '#8a9199' },
                  ]}
                />
              ) : null
            }
          />
          <Area type="monotone" dataKey="total_value_usd" stroke="#c9a961" strokeWidth={2} fill="url(#evolutionFill)" dot={false} />
          <Line type="monotone" dataKey="total_cost_usd" stroke="#8a9199" strokeWidth={2} strokeDasharray="4 4" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

// ------------------------------------------------------------- composition

export function AllocationBar({ slices }: { slices: Array<{ key: string; weight: number; valueUsd: number }> }) {
  if (slices.length === 0) return null;
  const labelOf = (k: string) => ASSET_CLASS_LABEL[k] ?? k;

  return (
    <div>
      {/* One bar, split by class. A 2px surface gap keeps adjacent fills apart. */}
      <div className="flex h-8 w-full gap-0.5 overflow-hidden" role="img"
        aria-label={slices.map((s) => `${labelOf(s.key)} ${s.weight.toFixed(1)}%`).join(', ')}>
        {slices.map((s, i) => (
          <div key={s.key} style={{ width: `${s.weight}%`, background: SERIES[i % SERIES.length] }} title={`${labelOf(s.key)}: ${fmtPct(s.weight)}`} />
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {slices.map((s, i) => (
          <li key={s.key} className="flex items-baseline gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 translate-y-0.5" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="text-text-dim">{labelOf(s.key)}</span>
            <span className="tnum ml-auto text-text">{s.weight.toFixed(1)}%</span>
            <span className="tnum w-24 text-right text-text-faint">{fmtUsd(s.valueUsd)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Weights as ranked bars: one measure, so one hue — colour carries no identity here. */
export function WeightBars({ rows }: { rows: Array<{ symbol: string; weight: number; valueUsd: number | null }> }) {
  if (rows.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="symbol" {...AXIS} tickLine={false} axisLine={false} width={72} />
        <Tooltip
          cursor={{ fill: '#1a1d20' }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox
                title={payload[0].payload.symbol}
                rows={[
                  { label: 'Peso', value: fmtPct(payload[0].payload.weight), color: '#c9a961' },
                  { label: 'Valor', value: fmtUsd(payload[0].payload.valueUsd) },
                ]}
              />
            ) : null
          }
        />
        <Bar dataKey="weight" radius={[0, 4, 4, 0]} maxBarSize={18}
          label={{ position: 'right', formatter: (v: unknown) => (typeof v === 'number' ? `${v.toFixed(1)}%` : ''), fill: '#8a9199', fontSize: 11, fontFamily: 'var(--font-jetbrains)' }}>
          {rows.map((r) => <Cell key={r.symbol} fill="#c9a961" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
