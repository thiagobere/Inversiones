import { computeIndicators } from '@/lib/analytics/indicators';
import { getHistory } from '@/lib/market';
import type { Position, Signal } from '@/lib/types';
import type { PortfolioView } from '@/lib/services/portfolio';

const fmt = (n: number, d = 1) => n.toFixed(d);

async function signalsForPosition(p: Position): Promise<Signal[]> {
  let closes: number[];
  try {
    closes = (await getHistory(p.symbol, '1y')).map((c) => c.c);
  } catch {
    return [];
  }
  if (closes.length < 20) return [];

  const ind = computeIndicators(closes);
  const out: Signal[] = [];
  const basis = `Calculado sobre ${closes.length} cierres del último año.`;

  if (ind.rsi14 !== null) {
    if (ind.rsi14 <= 30) {
      out.push({
        symbol: p.symbol, severity: 'strong',
        title: `${p.symbol} sobrevendido`,
        detail: `RSI 14 en ${fmt(ind.rsi14)}. Históricamente indica presión vendedora agotándose, no una garantía de rebote.`,
        basis,
      });
    } else if (ind.rsi14 >= 70) {
      out.push({
        symbol: p.symbol, severity: 'watch',
        title: `${p.symbol} sobrecomprado`,
        detail: `RSI 14 en ${fmt(ind.rsi14)}. La suba viene extendida respecto de su propio rango reciente.`,
        basis,
      });
    }
  }

  if (ind.sma50 !== null && ind.sma200 !== null) {
    const diff = ((ind.sma50 - ind.sma200) / ind.sma200) * 100;
    if (Math.abs(diff) < 1.5) {
      out.push({
        symbol: p.symbol, severity: 'watch',
        title: `${p.symbol}: SMA50 y SMA200 casi cruzadas`,
        detail: `La media de 50 está a ${fmt(diff)}% de la de 200. Los cruces suelen marcar cambios de tendencia de mediano plazo.`,
        basis,
      });
    }
  }

  if (ind.drawdownFromHigh !== null && ind.drawdownFromHigh <= -25) {
    out.push({
      symbol: p.symbol, severity: 'info',
      title: `${p.symbol} lejos de su máximo`,
      detail: `Cotiza ${fmt(Math.abs(ind.drawdownFromHigh))}% por debajo del máximo del último año.`,
      basis,
    });
  }

  if (ind.volatility30 !== null && ind.volatility30 >= 60) {
    out.push({
      symbol: p.symbol, severity: 'info',
      title: `${p.symbol} con volatilidad alta`,
      detail: `Volatilidad anualizada de 30 días en ${fmt(ind.volatility30, 0)}%. Esperá movimientos diarios amplios.`,
      basis,
    });
  }

  return out;
}

function portfolioSignals(view: PortfolioView): Signal[] {
  const out: Signal[] = [];
  const { concentration: c, positions } = view;

  if (c.largest && c.largest.weight >= 35) {
    out.push({
      symbol: c.largest.symbol, severity: 'strong',
      title: 'Cartera concentrada',
      detail: `${c.largest.symbol} representa el ${fmt(c.largest.weight)}% del total. Un movimiento fuerte en ese activo mueve casi toda tu cartera.`,
      basis: `Peso calculado sobre ${positions.length} posiciones valuadas en USD.`,
    });
  }

  if (positions.length >= 2 && c.effectivePositions < positions.length * 0.6) {
    out.push({
      symbol: null, severity: 'watch',
      title: 'Diversificación menor a la aparente',
      detail: `Tenés ${positions.length} posiciones, pero por sus pesos la cartera se comporta como si tuviera ${fmt(c.effectivePositions)}.`,
      basis: 'Posiciones efectivas = 1 / HHI sobre los pesos en USD.',
    });
  }

  const topClass = c.byAssetClass[0];
  if (topClass && topClass.weight >= 70 && c.byAssetClass.length > 1) {
    out.push({
      symbol: null, severity: 'info',
      title: 'Exposición dominada por una clase de activo',
      detail: `El ${fmt(topClass.weight)}% está en ${topClass.key.replace('_', ' ')}.`,
      basis: 'Agrupado por clase de activo sobre el valor de mercado en USD.',
    });
  }

  const ars = c.byCurrency.find((x) => x.key === 'ARS');
  if (ars && ars.weight >= 40) {
    out.push({
      symbol: null, severity: 'info',
      title: 'Peso alto en pesos',
      detail: `El ${fmt(ars.weight)}% de la cartera cotiza en ARS. Su valor en dólares depende del CCL además del precio del activo.`,
      basis: `Convertido al CCL ${view.fx.ccl ? fmt(view.fx.ccl, 0) : 'no disponible'}.`,
    });
  }

  return out;
}

const SEVERITY_ORDER = { strong: 0, watch: 1, info: 2 } as const;

export async function buildSignals(view: PortfolioView): Promise<Signal[]> {
  // Only the largest holdings: fetching a year of history for every symbol on
  // every page load would be slow and pointless for a 0.5% position.
  const top = view.positions.slice(0, 8);
  const perPosition = await Promise.all(top.map(signalsForPosition));

  return [...portfolioSignals(view), ...perPosition.flat()].sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}
