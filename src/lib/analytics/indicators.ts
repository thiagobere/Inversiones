/** Simple moving average of the last `period` values. Null until enough data. */
export function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;
  const window = values.slice(-period);
  return window.reduce((a, b) => a + b, 0) / period;
}

/**
 * Wilder's RSI — the standard 14-period formulation, using his smoothing
 * (not a plain average of the last 14 changes, which is a common wrong answer).
 * Returns 0..100, or null when there is not enough history.
 */
export function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;

  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;

  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Annualised volatility from daily closes, as a percentage. */
export function volatility(values: number[], period = 30): number | null {
  if (values.length < period + 1) return null;
  const window = values.slice(-(period + 1));

  const returns: number[] = [];
  for (let i = 1; i < window.length; i++) {
    if (window[i - 1] === 0) continue;
    returns.push(Math.log(window[i] / window[i - 1]));
  }
  if (returns.length < 2) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

export interface Indicators {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  volatility30: number | null;
  /** Percent below the highest close in the series (0 = at the high). */
  drawdownFromHigh: number | null;
}

export function computeIndicators(closes: number[]): Indicators {
  const high = closes.length ? Math.max(...closes) : null;
  const last = closes.at(-1) ?? null;

  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi14: rsi(closes, 14),
    volatility30: volatility(closes, 30),
    drawdownFromHigh: high && last ? ((last - high) / high) * 100 : null,
  };
}
