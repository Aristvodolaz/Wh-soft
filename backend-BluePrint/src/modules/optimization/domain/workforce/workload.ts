/**
 * Workforce load forecast.
 *
 *   norm(type, q)        = a_type + b_type · q          minutes   (a: fixed set-up, b: per unit)
 *   personal coefficient = Σ fact / Σ norm over the employee's last 30 shifts
 *   projected minutes    = norm · coefficient
 *
 * The (a, b) norms are calibrated per warehouse by least-squares regression of the real
 * task durations on quantity, shrunk towards engineering defaults when data is scarce.
 */

export interface Norm {
  /** Fixed minutes per task. */
  base: number;
  /** Minutes per unit of quantity. */
  perUnit: number;
}

export type NormSource = 'REGRESSION' | 'BLENDED' | 'DEFAULT';

export interface CalibratedNorm extends Norm {
  samples: number;
  /** Coefficient of determination of the regression (null when not fitted). */
  r2: number | null;
  source: NormSource;
}

export const DEFAULT_NORMS: Record<string, Norm> = {
  PICK: { base: 1.5, perUnit: 0.4 },
  PACK: { base: 2.0, perUnit: 0.5 },
  RECEIVE: { base: 3.0, perUnit: 0.3 },
  PUT_AWAY: { base: 2.0, perUnit: 0.3 },
  TRANSFER: { base: 2.0, perUnit: 0.2 },
  COUNT: { base: 3.0, perUnit: 0.2 },
  INSPECT: { base: 4.0, perUnit: 0.3 },
  REPLENISH: { base: 3.0, perUnit: 0.2 },
};
const FALLBACK_NORM: Norm = { base: 3, perUnit: 0.3 };

export interface TaskObservation {
  userId: string;
  type: string;
  quantity: number | null;
  durationMin: number;
  /** Shift identifier — the working day, e.g. '2026-03-17'. */
  shiftKey: string;
}

// ── Regression ──────────────────────────────────────────────────────────────────

export interface OlsResult {
  a: number;
  b: number;
  r2: number | null;
}

/** y = a + b·x by ordinary least squares, constrained to a ≥ 0, b ≥ 0. */
export function ols(xs: number[], ys: number[]): OlsResult {
  const n = xs.length;
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  let a: number;
  let b: number;
  if (sxx < 1e-9) {
    // All quantities equal — slope unidentifiable: constant duration
    return { a: my, b: 0, r2: null };
  }
  b = sxy / sxx;
  a = my - b * mx;
  if (b < 0) {
    b = 0;
    a = my;
  } else if (a < 0) {
    // Refit through the origin
    const sxx0 = xs.reduce((s, v) => s + v * v, 0);
    b = xs.reduce((s, v, i) => s + v * ys[i], 0) / sxx0;
    a = 0;
  }
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - (a + b * xs[i])) ** 2;
  return { a, b, r2: syy > 1e-9 ? Math.max(0, 1 - sse / syy) : null };
}

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Tukey fences on duration; sanity bounds 0 < d ≤ 8 h. */
export function filterOutliers(obs: TaskObservation[]): TaskObservation[] {
  const sane = obs.filter((o) => o.durationMin > 0 && o.durationMin <= 480);
  if (sane.length < 8) return sane;
  const sorted = sane.map((o) => o.durationMin).sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const hi = q3 + 1.5 * iqr;
  const lo = q1 - 1.5 * iqr;
  return sane.filter((o) => o.durationMin >= lo && o.durationMin <= hi);
}

export interface CalibrationOptions {
  /** Below this many samples a type keeps its default norm. */
  minSamples: number;
  /** Shrinkage strength: weight of the regression = n / (n + k). */
  shrinkK: number;
}

export function calibrateNorms(
  observations: TaskObservation[],
  defaults: Record<string, Norm> = DEFAULT_NORMS,
  opts: Partial<CalibrationOptions> = {},
): Record<string, CalibratedNorm> {
  const { minSamples = 10, shrinkK = 20 } = opts;
  const out: Record<string, CalibratedNorm> = {};

  const types = new Set([...Object.keys(defaults), ...observations.map((o) => o.type)]);
  for (const type of types) {
    const def = defaults[type] ?? FALLBACK_NORM;
    const obs = filterOutliers(observations.filter((o) => o.type === type));
    if (obs.length < minSamples) {
      out[type] = { ...def, samples: obs.length, r2: null, source: 'DEFAULT' };
      continue;
    }
    const fit = ols(
      obs.map((o) => o.quantity ?? 1),
      obs.map((o) => o.durationMin),
    );
    const w = obs.length / (obs.length + shrinkK);
    out[type] = {
      base: w * fit.a + (1 - w) * def.base,
      perUnit: w * fit.b + (1 - w) * def.perUnit,
      samples: obs.length,
      r2: fit.r2,
      source: w > 0.5 ? 'REGRESSION' : 'BLENDED',
    };
  }
  return out;
}

export function normMinutes(
  norms: Record<string, Norm>,
  type: string,
  quantity: number | null | undefined,
): number {
  const n = norms[type] ?? FALLBACK_NORM;
  return n.base + n.perUnit * (quantity && quantity > 0 ? quantity : 1);
}

// ── Personal coefficient ────────────────────────────────────────────────────────

export interface PersonalCoefficient {
  userId: string;
  coefficient: number;
  shiftsUsed: number;
  tasksUsed: number;
}

export interface CoefficientOptions {
  shifts: number;
  /** Prior strength in “tasks”: few observations pull the coefficient towards 1. */
  priorTasks: number;
  min: number;
  max: number;
}

/** > 1 means slower than the warehouse norm, < 1 faster. */
export function personalCoefficients(
  observations: TaskObservation[],
  norms: Record<string, Norm>,
  opts: Partial<CoefficientOptions> = {},
): Map<string, PersonalCoefficient> {
  const { shifts = 30, priorTasks = 10, min = 0.5, max = 2 } = opts;
  const byUser = new Map<string, TaskObservation[]>();
  for (const o of filterOutliers(observations)) {
    const list = byUser.get(o.userId) ?? [];
    list.push(o);
    byUser.set(o.userId, list);
  }

  const result = new Map<string, PersonalCoefficient>();
  for (const [userId, list] of byUser) {
    const lastShifts = [...new Set(list.map((o) => o.shiftKey))].sort().reverse().slice(0, shifts);
    const keep = new Set(lastShifts);
    const used = list.filter((o) => keep.has(o.shiftKey));
    const fact = used.reduce((s, o) => s + o.durationMin, 0);
    const planned = used.reduce((s, o) => s + normMinutes(norms, o.type, o.quantity), 0);
    const raw = planned > 0 ? fact / planned : 1;
    const n = used.length;
    const shrunk = (raw * n + 1 * priorTasks) / (n + priorTasks);
    result.set(userId, {
      userId,
      coefficient: Math.min(max, Math.max(min, shrunk)),
      shiftsUsed: lastShifts.length,
      tasksUsed: n,
    });
  }
  return result;
}

// ── Forecast ────────────────────────────────────────────────────────────────────

export interface OpenTask {
  id: string;
  type: string;
  quantity: number | null;
  assignedTo: string | null;
  /** Working day the task must be done by (YYYY-MM-DD); null → `today`. */
  dueDay: string | null;
}

export interface Employee {
  userId: string;
  name: string;
}

export interface WorkloadParams {
  shiftMinutes: number;
  breakMinutes: number;
  /** Realistic share of a shift spent on tasks (walking, waiting, admin). */
  utilization: number;
  highLoadPct: number;
}

export const DEFAULT_WORKLOAD_PARAMS: WorkloadParams = {
  shiftMinutes: 480,
  breakMinutes: 45,
  utilization: 0.85,
  highLoadPct: 85,
};

export type LoadStatus = 'OK' | 'HIGH' | 'OVERLOAD';

export interface EmployeeLoad {
  userId: string;
  name: string;
  coefficient: number;
  assignedTasks: number;
  projectedMinutes: number;
  capacityMinutes: number;
  loadPct: number;
  status: LoadStatus;
}

export interface DayForecast {
  day: string;
  tasks: number;
  /** Required time at warehouse norms, minutes. */
  normMinutes: number;
  /** Required time after personal coefficients, minutes. */
  projectedMinutes: number;
  capacityMinutes: number;
  loadPct: number;
  /** Employees needed to cover projectedMinutes. */
  fteNeeded: number;
  fteAvailable: number;
  fteShortage: number;
  status: LoadStatus;
  byType: Record<string, { tasks: number; minutes: number }>;
  employees: EmployeeLoad[];
}

function statusOf(pct: number, high: number): LoadStatus {
  return pct > 100 ? 'OVERLOAD' : pct >= high ? 'HIGH' : 'OK';
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

export function forecastWorkload(args: {
  tasks: OpenTask[];
  employees: Employee[];
  norms: Record<string, Norm>;
  coefficients: Map<string, PersonalCoefficient>;
  today: string;
  params?: Partial<WorkloadParams>;
}): DayForecast[] {
  const p = { ...DEFAULT_WORKLOAD_PARAMS, ...args.params };
  const perPersonCapacity = (p.shiftMinutes - p.breakMinutes) * p.utilization;
  const coefOf = (id: string): number => args.coefficients.get(id)?.coefficient ?? 1;

  // Unassigned work is expected to be spread over the team → use its average coefficient.
  const avgCoef = args.employees.length
    ? args.employees.reduce((s, e) => s + coefOf(e.userId), 0) / args.employees.length
    : 1;

  const days = new Map<string, OpenTask[]>();
  for (const t of args.tasks) {
    const d = t.dueDay ?? args.today;
    const key = d < args.today ? args.today : d; // overdue work lands on today
    const list = days.get(key) ?? [];
    list.push(t);
    days.set(key, list);
  }

  const out: DayForecast[] = [];
  for (const day of [...days.keys()].sort()) {
    const tasks = days.get(day)!;
    let normTotal = 0;
    let projTotal = 0;
    const byType: DayForecast['byType'] = {};
    const perEmp = new Map<string, { n: number; min: number }>();

    for (const t of tasks) {
      const norm = normMinutes(args.norms, t.type, t.quantity);
      const coef = t.assignedTo ? coefOf(t.assignedTo) : avgCoef;
      const proj = norm * coef;
      normTotal += norm;
      projTotal += proj;
      const bt = (byType[t.type] ??= { tasks: 0, minutes: 0 });
      bt.tasks++;
      bt.minutes = r1(bt.minutes + proj);
      if (t.assignedTo) {
        const e = perEmp.get(t.assignedTo) ?? { n: 0, min: 0 };
        e.n++;
        e.min += proj;
        perEmp.set(t.assignedTo, e);
      }
    }

    const capacity = args.employees.length * perPersonCapacity;
    const loadPct = capacity > 0 ? (projTotal / capacity) * 100 : projTotal > 0 ? Infinity : 0;
    const fteNeeded = perPersonCapacity > 0 ? projTotal / perPersonCapacity : 0;

    const employees: EmployeeLoad[] = args.employees.map((e) => {
      const agg = perEmp.get(e.userId) ?? { n: 0, min: 0 };
      const pct = perPersonCapacity > 0 ? (agg.min / perPersonCapacity) * 100 : 0;
      return {
        userId: e.userId,
        name: e.name,
        coefficient: Math.round(coefOf(e.userId) * 100) / 100,
        assignedTasks: agg.n,
        projectedMinutes: r1(agg.min),
        capacityMinutes: r1(perPersonCapacity),
        loadPct: r1(pct),
        status: statusOf(pct, p.highLoadPct),
      };
    });

    out.push({
      day,
      tasks: tasks.length,
      normMinutes: r1(normTotal),
      projectedMinutes: r1(projTotal),
      capacityMinutes: r1(capacity),
      loadPct: Number.isFinite(loadPct) ? r1(loadPct) : 999,
      fteNeeded: Math.round(fteNeeded * 100) / 100,
      fteAvailable: args.employees.length,
      fteShortage: Math.max(0, Math.ceil(fteNeeded - args.employees.length - 1e-9)),
      status: statusOf(loadPct, p.highLoadPct),
      byType,
      employees,
    });
  }
  return out;
}
