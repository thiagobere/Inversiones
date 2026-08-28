import type { ReactNode } from 'react';
import { fmtPct, fmtSignedUsd } from '@/lib/format';

export function Card({
  title, action, children, className = '',
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-hairline bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5">
          {title && <h2 className="label">{title}</h2>}
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label, value, sub, accent = false,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="label mb-2">{label}</p>
      <p className={`tnum text-2xl leading-none ${accent ? 'text-accent' : 'text-text'}`}>{value}</p>
      {sub && <p className="mt-2 text-sm text-text-dim">{sub}</p>}
    </div>
  );
}

/**
 * A gain/loss figure. The arrow and the sign carry the meaning on their own —
 * colour is reinforcement, never the only channel.
 */
export function Delta({
  value, pct, size = 'base',
}: {
  value?: number | null;
  pct?: number | null;
  size?: 'sm' | 'base' | 'lg';
}) {
  const basis = value ?? pct ?? null;
  if (basis === null || !Number.isFinite(basis)) return <span className="text-text-faint">—</span>;

  const up = basis >= 0;
  const sizes = { sm: 'text-xs', base: 'text-sm', lg: 'text-xl' };

  return (
    <span className={`tnum inline-flex items-baseline gap-1.5 ${sizes[size]} ${up ? 'text-up' : 'text-down'}`}>
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {value !== undefined && value !== null && <span>{fmtSignedUsd(value)}</span>}
      {pct !== undefined && pct !== null && (
        <span className={value !== undefined && value !== null ? 'text-text-dim' : ''}>
          {fmtPct(pct)}
        </span>
      )}
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'up' | 'down' | 'warn' }) {
  const tones = {
    neutral: 'border-hairline-strong text-text-dim',
    accent: 'border-accent-dim text-accent',
    up: 'border-up/40 text-up',
    down: 'border-down/40 text-down',
    warn: 'border-warn/40 text-warn',
  };
  return (
    <span className={`label inline-block border px-2 py-1 ${tones[tone]}`} style={{ letterSpacing: '0.1em' }}>
      {children}
    </span>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="serif text-lg text-text-dim">{title}</p>
      {hint && <p className="mx-auto mt-2 max-w-md text-sm text-text-faint">{hint}</p>}
    </div>
  );
}

export function Loading({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-10 text-text-faint">
      <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
      <span className="label">{label}</span>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="border border-down/40 bg-down/5 px-4 py-3 text-sm text-down">{message}</div>
  );
}

export function Disclaimer() {
  return (
    <p className="border-t border-hairline pt-4 text-xs leading-relaxed text-text-faint">
      Esta información es de carácter general y educativo. No constituye asesoramiento financiero
      ni una recomendación de compra o venta. Los datos provienen de fuentes públicas no oficiales
      y pueden tener demoras o errores. Verificá siempre antes de operar.
    </p>
  );
}
