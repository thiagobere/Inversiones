import { fetchJson } from '@/lib/market/http';
import type { FxRates } from '@/lib/types';

interface DolarRow {
  casa: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  fechaActualizacion: string;
}

/**
 * ARS per USD across the parallel markets. `bolsa` is MEP and
 * `contadoconliqui` is CCL — the two that matter for valuing local assets.
 */
export async function getRates(): Promise<FxRates> {
  const rows = await fetchJson<DolarRow[]>('https://dolarapi.com/v1/dolares');
  const mid = (casa: string): number | null => {
    const r = rows.find((x) => x.casa === casa);
    if (!r) return null;
    const { compra, venta } = r;
    if (compra != null && venta != null) return (compra + venta) / 2;
    return venta ?? compra ?? null;
  };

  return {
    oficial: mid('oficial'),
    blue: mid('blue'),
    mep: mid('bolsa'),
    ccl: mid('contadoconliqui'),
    cripto: mid('cripto'),
    fetchedAt: Date.now(),
  };
}
