/**
 * Exponential smoothing with a self-tuned smoothing factor α and optional
 * multiplicative seasonality (Holt–Winters without trend — warehouse demand is
 * level + seasonal; a trend term over-fits on 90-day windows).
 *
 *   forecast:  ŷ(t)  = l(t−1) · s(t−m)
 *   level:     l(t)  = α · y(t)/s(t−m) + (1−α) · l(t−1)
 *   season:    s(t)  = γ · y(t)/l(t)   + (1−γ) · s(t−m)
 *
 * α (and γ) are NOT constants: for every series they are chosen by minimising
 * the mean squared one-step-ahead error over the training window (default 90 d).
 * Search = coarse grid + fine local refinement.
 */

const EPS = 1e-6;
const SEASON_MIN = 0.1;
const SEASON_MAX = 4;

export interface FitOptions {
  /** Season length in observations (7 = weekly seasonality on daily data). */
  seasonLength?: number;
  /** Use only the last N observations for fitting. */
  window?: number;
  /** Seasonal model must beat the non-seasonal one by this factor to be used. */
  seasonalityGain?: number;
}

export interface HoltWintersFit {
  alpha: number;
  gamma: number | null;
  mse: number;
  rmse: number;
  /** Std of one-step-ahead errors (≈ per-period forecast uncertainty). */
  residualStd: number;
  level: number;
  seasonal: number[];
  seasonLength: number;
  seasonalityUsed: boolean;
  /** Number of observations used. */
  n: number;
  /** Position inside the season of the first FUTURE observation. */
  nextPhase: number;
}

interface Init {
  level: number;
  seasonal: number[];
}

function mean(a: number[]): number {
  return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function initState(y: number[], m: number, seasonal: boolean): Init {
  if (!seasonal) return { level: mean(y.slice(0, Math.min(y.length, 7))), seasonal: [1] };

  // Seasonal indices are estimated from the first 2 seasons only; the rest of the
  // series is out-of-sample for them, so tuning cannot simply memorise noise.
  const seasons = Math.min(2, Math.floor(y.length / m));
  const seasonMeans: number[] = [];
  for (let k = 0; k < seasons; k++) seasonMeans.push(mean(y.slice(k * m, k * m + m)));

  const s: number[] = [];
  for (let i = 0; i < m; i++) {
    const ratios: number[] = [];
    for (let k = 0; k < seasons; k++) {
      if (seasonMeans[k] > EPS) ratios.push(y[k * m + i] / seasonMeans[k]);
    }
    s.push(ratios.length ? mean(ratios) : 1);
  }
  const sm = mean(s) || 1;
  return { level: Math.max(seasonMeans[0], EPS), seasonal: s.map((v) => clamp(v / sm, SEASON_MIN, SEASON_MAX)) };
}

interface RunResult {
  mse: number;
  level: number;
  seasonal: number[];
  errors: number[];
}

function run(
  y: number[],
  m: number,
  alpha: number,
  gamma: number | null,
  init: Init,
  warm: number,
): RunResult {
  const seasonal = gamma !== null;
  let l = init.level;
  const s = init.seasonal.slice();
  const period = seasonal ? m : 1;
  let sse = 0;
  let cnt = 0;
  const errors: number[] = [];

  for (let t = 0; t < y.length; t++) {
    const idx = t % period;
    const st = seasonal ? s[idx] : 1;
    const e = y[t] - l * st;
    if (t >= warm) {
      sse += e * e;
      cnt++;
      errors.push(e);
    }
    const lNew = alpha * (y[t] / Math.max(st, EPS)) + (1 - alpha) * l;
    if (seasonal) {
      s[idx] = clamp(gamma! * (y[t] / Math.max(lNew, EPS)) + (1 - gamma!) * st, SEASON_MIN, SEASON_MAX);
    }
    l = Math.max(lNew, 0);
  }
  return { mse: cnt ? sse / cnt : Infinity, level: l, seasonal: s, errors };
}

function frange(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) out.push(Math.round(v * 1e4) / 1e4);
  return out;
}

function tune(
  y: number[],
  m: number,
  seasonal: boolean,
  warm: number,
): { alpha: number; gamma: number | null; res: RunResult; init: Init } {
  const init = initState(y, m, seasonal);
  const coarse = frange(0.05, 0.95, 0.05);
  let best = { alpha: 0.3, gamma: seasonal ? 0.2 : null, mse: Infinity } as {
    alpha: number;
    gamma: number | null;
    mse: number;
  };

  const consider = (alpha: number, gamma: number | null): void => {
    const r = run(y, m, alpha, gamma, init, warm);
    if (r.mse < best.mse - 1e-12) best = { alpha, gamma, mse: r.mse };
  };

  for (const a of coarse) {
    if (seasonal) for (const g of coarse) consider(a, g);
    else consider(a, null);
  }
  // Fine refinement around the coarse optimum
  const aFine = frange(clamp(best.alpha - 0.04, 0.01, 0.99), clamp(best.alpha + 0.04, 0.01, 0.99), 0.01);
  if (seasonal) {
    const g0 = best.gamma as number;
    const gFine = frange(clamp(g0 - 0.04, 0.01, 0.99), clamp(g0 + 0.04, 0.01, 0.99), 0.01);
    for (const a of aFine) for (const g of gFine) consider(a, g);
  } else {
    for (const a of aFine) consider(a, null);
  }

  return { alpha: best.alpha, gamma: best.gamma, res: run(y, m, best.alpha, best.gamma, init, warm), init };
}

export function fitHoltWinters(series: number[], opts: FitOptions = {}): HoltWintersFit {
  const m = opts.seasonLength ?? 7;
  const window = opts.window ?? 90;
  const gain = opts.seasonalityGain ?? 0.9;
  const y = series.slice(-window).map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const n = y.length;

  if (n === 0) {
    return {
      alpha: 0.3, gamma: null, mse: 0, rmse: 0, residualStd: 0, level: 0,
      seasonal: [1], seasonLength: m, seasonalityUsed: false, n: 0, nextPhase: 0,
    };
  }

  // Both models are scored over the same range so their MSEs are comparable.
  const canSeason = m > 1 && n >= 3 * m;
  const warm = canSeason ? 2 * m : Math.min(3, Math.max(n - 1, 0));
  const plain = tune(y, m, false, warm);
  let chosen: { alpha: number; gamma: number | null; res: RunResult; init: Init } = plain;
  let seasonalityUsed = false;

  if (canSeason) {
    const seas = tune(y, m, true, warm);
    if (seas.res.mse < plain.res.mse * gain) {
      chosen = seas;
      seasonalityUsed = true;
    }
  }

  const { res } = chosen;
  const errMean = mean(res.errors);
  const variance = res.errors.length
    ? res.errors.reduce((s, e) => s + (e - errMean) ** 2, 0) / res.errors.length
    : 0;

  const seasonal = seasonalityUsed ? res.seasonal : [1];
  const sm = mean(seasonal) || 1;

  return {
    alpha: chosen.alpha,
    gamma: chosen.gamma,
    mse: res.mse === Infinity ? 0 : res.mse,
    rmse: res.mse === Infinity ? 0 : Math.sqrt(res.mse),
    residualStd: Math.sqrt(variance),
    level: res.level,
    seasonal: seasonal.map((v) => v / sm),
    seasonLength: seasonalityUsed ? m : 1,
    seasonalityUsed,
    n,
    nextPhase: seasonalityUsed ? n % m : 0,
  };
}

/** Point forecast for the next `h` periods. */
export function forecast(fit: HoltWintersFit, h: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < h; k++) {
    const s = fit.seasonal[(fit.nextPhase + k) % fit.seasonal.length];
    out.push(Math.max(0, fit.level * s));
  }
  return out;
}

/**
 * Time (in periods, fractional) until `stock` is exhausted.
 * `z` > 0 makes the estimate conservative: cumulative demand is inflated by
 * z·σ·√k (σ = per-period forecast error std), i.e. the upper z-quantile of demand.
 * Returns null when stock outlasts the forecast horizon.
 */
export function timeToDepletion(
  stock: number,
  forecasts: number[],
  sigma = 0,
  z = 0,
): number | null {
  if (stock <= 0) return 0;
  let cum = 0;
  let prev = 0;
  for (let i = 0; i < forecasts.length; i++) {
    cum += Math.max(0, forecasts[i]);
    const upper = cum + z * sigma * Math.sqrt(i + 1);
    if (upper >= stock) {
      const step = upper - prev;
      return i + (step > EPS ? (stock - prev) / step : 0);
    }
    prev = upper;
  }
  return null;
}

/** Fill a dense daily series from sparse (date → qty) rows; oldest → newest. */
export function buildDailySeries(
  rows: Array<{ day: string; qty: number }>,
  endDay: string,
  days: number,
): number[] {
  const byDay = new Map<string, number>();
  for (const r of rows) byDay.set(r.day, (byDay.get(r.day) ?? 0) + Number(r.qty));
  const end = Date.UTC(+endDay.slice(0, 4), +endDay.slice(5, 7) - 1, +endDay.slice(8, 10));
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end - i * 86_400_000).toISOString().slice(0, 10);
    out.push(byDay.get(d) ?? 0);
  }
  return out;
}
