import { buildDailySeries, fitHoltWinters, forecast, timeToDepletion } from '../holt-winters';

/** Deterministic pseudo-random generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEK = [1.6, 1.2, 1.0, 0.9, 1.1, 0.7, 0.5]; // mean = 1

function seasonalSeries(n: number, base: number, noise: number, seed = 1): number[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, t) =>
    Math.max(0, base * WEEK[t % 7] + (r() - 0.5) * 2 * noise),
  );
}

describe('fitHoltWinters', () => {
  it('detects weekly seasonality and forecasts the pattern', () => {
    const y = seasonalSeries(90, 20, 1);
    const fit = fitHoltWinters(y);
    expect(fit.seasonalityUsed).toBe(true);
    expect(fit.seasonLength).toBe(7);

    const f = forecast(fit, 7);
    // Day 90 is phase 90 % 7 = 6 → forecast must track WEEK pattern
    for (let k = 0; k < 7; k++) {
      const truth = 20 * WEEK[(90 + k) % 7];
      expect(Math.abs(f[k] - truth)).toBeLessThan(truth * 0.2 + 1.5);
    }
  });

  it('does not use seasonality for a flat noisy series', () => {
    const r = rng(7);
    const y = Array.from({ length: 90 }, () => 10 + (r() - 0.5) * 4);
    const fit = fitHoltWinters(y);
    expect(fit.seasonalityUsed).toBe(false);
    expect(fit.alpha).toBeLessThan(0.5); // heavy smoothing for pure noise
    expect(forecast(fit, 3)[0]).toBeGreaterThan(8);
    expect(forecast(fit, 3)[0]).toBeLessThan(12);
  });

  it('adapts α upward after a level shift', () => {
    const y = [...Array(45).fill(5), ...Array(45).fill(30)];
    const fit = fitHoltWinters(y, { seasonLength: 1 });
    expect(fit.alpha).toBeGreaterThan(0.5);
    expect(forecast(fit, 1)[0]).toBeGreaterThan(25);
  });

  it('tunes α per series — different series yield different α', () => {
    const r = rng(3);
    const noisy = Array.from({ length: 90 }, () => 10 + (r() - 0.5) * 6);
    const shifted = [...Array(45).fill(5), ...Array(45).fill(30)];
    expect(fitHoltWinters(shifted, { seasonLength: 1 }).alpha).toBeGreaterThan(
      fitHoltWinters(noisy, { seasonLength: 1 }).alpha,
    );
  });

  it('respects the window (only the last N points influence the fit)', () => {
    const y = [...Array(200).fill(100), ...Array(90).fill(10)];
    const fit = fitHoltWinters(y, { window: 90, seasonLength: 1 });
    expect(fit.n).toBe(90);
    expect(forecast(fit, 1)[0]).toBeCloseTo(10, 0);
  });

  it('handles empty and tiny series', () => {
    expect(fitHoltWinters([]).level).toBe(0);
    const fit = fitHoltWinters([3, 4]);
    expect(Number.isFinite(forecast(fit, 5)[0])).toBe(true);
  });

  it('handles intermittent demand (many zeros) without NaN', () => {
    const y = Array.from({ length: 90 }, (_, t) => (t % 5 === 0 ? 8 : 0));
    const fit = fitHoltWinters(y);
    for (const v of forecast(fit, 14)) expect(Number.isFinite(v)).toBe(true);
  });
});

describe('timeToDepletion', () => {
  it('constant demand: stock / rate', () => {
    expect(timeToDepletion(100, Array(30).fill(10))).toBeCloseTo(10, 6);
    expect(timeToDepletion(25, Array(30).fill(10))).toBeCloseTo(2.5, 6);
  });

  it('returns 0 for zero stock and null beyond the horizon', () => {
    expect(timeToDepletion(0, [5, 5])).toBe(0);
    expect(timeToDepletion(1000, Array(10).fill(1))).toBeNull();
  });

  it('conservative estimate is shorter than the point estimate', () => {
    const f = Array(30).fill(10);
    const point = timeToDepletion(100, f)!;
    const safe = timeToDepletion(100, f, 4, 1.28)!;
    expect(safe).toBeLessThan(point);
  });

  it('follows the seasonal profile', () => {
    // Day 0 eats 30, day 1 the remaining 5 → depleted at t = 2
    const f = [30, 5, 5, 5, 5, 5, 5];
    expect(timeToDepletion(35, f)).toBeCloseTo(2, 6);
  });
});

describe('buildDailySeries', () => {
  it('fills gaps with zeros, oldest → newest', () => {
    const s = buildDailySeries(
      [
        { day: '2026-03-10', qty: 4 },
        { day: '2026-03-12', qty: 7 },
        { day: '2026-03-12', qty: 1 },
      ],
      '2026-03-12',
      4,
    );
    expect(s).toEqual([0, 4, 0, 8]);
  });
});
