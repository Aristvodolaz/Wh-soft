export type AbcClass = 'A' | 'B' | 'C';
export type XyzClass = 'X' | 'Y' | 'Z';

export interface SkuDemand {
  productId: string;
  sku: string;
  /** Pick lines (OUTBOUND movements) in the rolling window — the travel driver. */
  picks: number;
  /** Units shipped per week inside the window, oldest → newest. */
  weeklyUnits: number[];
}

export interface Classified<T extends SkuDemand = SkuDemand> {
  item: T;
  abc: AbcClass;
  xyz: XyzClass;
  /** Coefficient of variation of weekly demand (σ/μ); Infinity when μ = 0. */
  cv: number;
  /** Share of total picks, 0..1. */
  pickShare: number;
}

export interface AbcXyzThresholds {
  /** Cumulative pick share covered by class A (default 0.80). */
  a: number;
  /** Cumulative pick share covered by A+B (default 0.95). */
  b: number;
  /** CV upper bound for X (default 0.5). */
  x: number;
  /** CV upper bound for Y (default 1.0). */
  y: number;
}

export const DEFAULT_THRESHOLDS: AbcXyzThresholds = { a: 0.8, b: 0.95, x: 0.5, y: 1.0 };

export type AbcXyzMatrix = Record<AbcClass, Record<XyzClass, number>>;

export function coefficientOfVariation(values: number[]): number {
  if (!values.length) return Infinity;
  const mu = values.reduce((s, v) => s + v, 0) / values.length;
  if (mu <= 0) return Infinity;
  const variance = values.reduce((s, v) => s + (v - mu) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mu;
}

export function classifyXyz(cv: number, t: AbcXyzThresholds = DEFAULT_THRESHOLDS): XyzClass {
  if (cv <= t.x) return 'X';
  if (cv <= t.y) return 'Y';
  return 'Z';
}

/**
 * ABC by pick-frequency Pareto: a SKU is A while the cumulative share *before* it is
 * below the A threshold (so the SKU that crosses the line stays in A); same for B.
 * XYZ by coefficient of variation of weekly demand over the rolling window.
 */
export function classifyAbcXyz<T extends SkuDemand>(
  skus: T[],
  thresholds: AbcXyzThresholds = DEFAULT_THRESHOLDS,
): { items: Classified<T>[]; matrix: AbcXyzMatrix } {
  const total = skus.reduce((s, k) => s + k.picks, 0);
  const sorted = [...skus].sort((a, b) => b.picks - a.picks || a.sku.localeCompare(b.sku));

  let cum = 0;
  const items: Classified<T>[] = sorted.map((item) => {
    const before = total > 0 ? cum / total : 1;
    let abc: AbcClass;
    if (item.picks <= 0) abc = 'C';
    else if (before < thresholds.a) abc = 'A';
    else if (before < thresholds.b) abc = 'B';
    else abc = 'C';
    cum += item.picks;
    const cv = coefficientOfVariation(item.weeklyUnits);
    return {
      item,
      abc,
      xyz: classifyXyz(cv, thresholds),
      cv,
      pickShare: total > 0 ? item.picks / total : 0,
    };
  });

  const matrix: AbcXyzMatrix = {
    A: { X: 0, Y: 0, Z: 0 },
    B: { X: 0, Y: 0, Z: 0 },
    C: { X: 0, Y: 0, Z: 0 },
  };
  for (const c of items) matrix[c.abc][c.xyz]++;
  return { items, matrix };
}
