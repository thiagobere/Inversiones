const usd = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const ars = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const plain = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

export const DASH = '—';

export function fmtUsd(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : usd.format(n);
}

export function fmtArs(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : ars.format(n);
}

export function fmtMoney(n: number | null | undefined, currency: string): string {
  return currency === 'ARS' ? fmtArs(n) : fmtUsd(n);
}

export function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(n);
}

export function fmtCompact(n: number | null | undefined): string {
  return n === null || n === undefined || !Number.isFinite(n) ? DASH : compact.format(n);
}

/** Always carries an explicit sign: colour is never the only cue. */
export function fmtPct(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return `${n >= 0 ? '+' : ''}${plain.format(Number(n.toFixed(digits)))}%`;
}

export function fmtSignedUsd(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return DASH;
  return `${n >= 0 ? '+' : '−'}${usd.format(Math.abs(n))}`;
}

export function fmtDate(input: number | string | null | undefined): string {
  if (!input) return DASH;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return DASH;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtRelative(ts: number | null | undefined): string {
  if (!ts) return DASH;
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return 'recién';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

export const ASSET_CLASS_LABEL: Record<string, string> = {
  us_equity: 'Acción USA',
  ar_equity: 'Acción ARG',
  cedear: 'CEDEAR',
  crypto: 'Cripto',
};
