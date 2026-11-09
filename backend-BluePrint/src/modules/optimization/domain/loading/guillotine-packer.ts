/**
 * 3D vehicle loading — guillotine free-space heuristic.
 *
 * Coordinates (cm): x = along the vehicle, 0 at the FRONT wall, L at the REAR DOOR;
 * y = across; z = up. Loading proceeds from the front wall towards the door.
 *
 * Rules enforced while packing (hard):
 *  - 6 orientations per box (2 if “this side up”)
 *  - guillotine cuts only, with the vertical cut last → every free space is fully supported
 *  - heavy-under-light: a box may rest only on a box at least as heavy; per-box max load above
 *  - LIFO along the route: nothing that is delivered LATER may stand between a box and the door
 *  - payload limit
 * Verified after packing, and used to choose between strategies:
 *  - centre of gravity inside the tolerance box
 *  - axle loads within limits (and front axle not unloaded)
 *
 * Multi-start: split rule × ordering × balance weight; best feasible plan within the time budget.
 */

export interface CargoItem {
  id: string;
  label?: string;
  /** Dimensions, cm. */
  l: number;
  w: number;
  h: number;
  weightKg: number;
  /** Delivery sequence along the route: 1 = first drop. */
  stop: number;
  /** Must keep its original height vertical. */
  thisSideUp?: boolean;
  /** Max weight allowed on top, kg. Fragile → 0. Default: unlimited. */
  maxLoadAboveKg?: number;
  fragile?: boolean;
}

export interface Vehicle {
  length: number;
  width: number;
  height: number;
  maxPayloadKg: number;
  /** Axle positions measured from the front wall, cm. Enables axle checks when both set. */
  frontAxleX?: number;
  rearAxleX?: number;
  maxFrontAxleKg?: number;
  maxRearAxleKg?: number;
  /** Empty vehicle weight and its centre of gravity (x from front wall) — included in axle loads. */
  tareKg?: number;
  tareCogX?: number;
  /** Allowed COG offset as a fraction of length/width from the target. */
  cogToleranceX?: number;
  cogToleranceY?: number;
  /** Target COG x as a fraction of length (default 0.5, or the mid-point between axles if set). */
  cogTargetX?: number;
}

export interface PackOptions {
  /** Wall-clock budget, ms (default 5000). */
  timeLimitMs?: number;
}

export interface Placement {
  id: string;
  label?: string;
  x: number;
  y: number;
  z: number;
  /** Oriented extents. */
  dx: number;
  dy: number;
  dz: number;
  weightKg: number;
  stop: number;
  /** Id of the box underneath, or null when on the floor. */
  supportId: string | null;
}

export type UnplacedReason = 'NO_SPACE' | 'PAYLOAD_EXCEEDED' | 'TOO_LARGE';

export interface PackResult {
  placements: Placement[];
  unplaced: Array<{ id: string; reason: UnplacedReason }>;
  metrics: {
    volumeUtilizationPct: number;
    loadedWeightKg: number;
    payloadUtilizationPct: number;
    cog: { x: number; y: number; z: number };
    cogOffsetXPct: number;
    cogOffsetYPct: number;
    frontAxleKg: number | null;
    rearAxleKg: number | null;
  };
  violations: Array<{ code: string; message: string }>;
  feasible: boolean;
  computeMs: number;
  strategiesTried: number;
}

// ── Internals ───────────────────────────────────────────────────────────────────

const EPS = 1e-6;

interface Space {
  x: number;
  y: number;
  z: number;
  dx: number;
  dy: number;
  dz: number;
  /** Index into placed[] of the box this space sits on; -1 = vehicle floor. */
  support: number;
}

interface Placed extends Placement {
  supportIdx: number;
  maxLoad: number;
  loadAbove: number;
  item: CargoItem;
}

type SplitRule = 'LONGER_FIRST' | 'SHORTER_FIRST';
type Ordering = 'VOLUME' | 'WEIGHT' | 'FOOTPRINT';

interface Strategy {
  split: SplitRule;
  ordering: Ordering;
  /** cm of COG-y deviation that is worth one cm of x-depth. */
  balance: number;
}

function orientations(it: CargoItem): Array<[number, number, number]> {
  const seen = new Set<string>();
  const out: Array<[number, number, number]> = [];
  const perms: Array<[number, number, number]> = it.thisSideUp
    ? [
        [it.l, it.w, it.h],
        [it.w, it.l, it.h],
      ]
    : [
        [it.l, it.w, it.h],
        [it.l, it.h, it.w],
        [it.w, it.l, it.h],
        [it.w, it.h, it.l],
        [it.h, it.l, it.w],
        [it.h, it.w, it.l],
      ];
  for (const p of perms) {
    const k = p.join('x');
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
    }
  }
  return out;
}

function sortItems(items: CargoItem[], ordering: Ordering): CargoItem[] {
  const vol = (i: CargoItem): number => i.l * i.w * i.h;
  const foot = (i: CargoItem): number => Math.max(i.l * i.w, i.l * i.h, i.w * i.h);
  const key = (i: CargoItem): number => (ordering === 'WEIGHT' ? i.weightKg : ordering === 'FOOTPRINT' ? foot(i) : vol(i));
  // Stop DESC first (last drop goes in deepest); within a stop, heavy/big first.
  return [...items].sort((a, b) => b.stop - a.stop || key(b) - key(a) || b.weightKg - a.weightKg || a.id.localeCompare(b.id));
}

function overlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 - EPS && b0 < a1 - EPS;
}

interface RunOutcome {
  placed: Placed[];
  unplaced: PackResult['unplaced'];
  aborted: boolean;
}

function runStrategy(items: CargoItem[], v: Vehicle, strat: Strategy, deadline: number, mustFinish: boolean): RunOutcome {
  const ordered = sortItems(items, strat.ordering);
  const placed: Placed[] = [];
  const unplaced: PackResult['unplaced'] = [];
  let spaces: Space[] = [{ x: 0, y: 0, z: 0, dx: v.length, dy: v.width, dz: v.height, support: -1 }];
  let totalWeight = 0;
  let momentY = 0; // Σ w·cy
  const targetY = v.width / 2;

  for (const it of ordered) {
    if (!mustFinish && performance.now() > deadline) return { placed, unplaced, aborted: true };

    if (totalWeight + it.weightKg > v.maxPayloadKg + EPS) {
      unplaced.push({ id: it.id, reason: 'PAYLOAD_EXCEEDED' });
      continue;
    }
    const oris = orientations(it);
    if (!oris.some(([a, b, c]) => a <= v.length + EPS && b <= v.width + EPS && c <= v.height + EPS)) {
      unplaced.push({ id: it.id, reason: 'TOO_LARGE' });
      continue;
    }

    let best: { si: number; o: [number, number, number]; score: number } | null = null;

    for (let si = 0; si < spaces.length; si++) {
      const sp = spaces[si];
      // Support rules depend only on the space → check once
      if (sp.support >= 0) {
        const sup = placed[sp.support];
        if (it.weightKg > sup.weightKg + EPS) continue; // heavy over light
        let ok = true;
        for (let idx = sp.support; idx >= 0; idx = placed[idx].supportIdx) {
          if (placed[idx].loadAbove + it.weightKg > placed[idx].maxLoad + EPS) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }

      for (const o of oris) {
        const [a, b, c] = o;
        if (a > sp.dx + EPS || b > sp.dy + EPS || c > sp.dz + EPS) continue;

        // LIFO: nothing delivered later may stand between this box and the door
        let blocked = false;
        for (const p of placed) {
          if (
            p.stop > it.stop &&
            p.x >= sp.x + a - EPS &&
            overlap(sp.y, sp.y + b, p.y, p.y + p.dy) &&
            overlap(sp.z, sp.z + c, p.z, p.z + p.dz)
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        const cy = sp.y + b / 2;
        const newCogY = (momentY + it.weightKg * cy) / (totalWeight + it.weightKg || 1);
        const waste = sp.dx * sp.dy * sp.dz - a * b * c;
        const score = sp.x + sp.z * 0.5 + strat.balance * Math.abs(newCogY - targetY) + waste * 1e-9;
        if (!best || score < best.score - 1e-9) best = { si, o, score };
      }
    }

    if (!best) {
      unplaced.push({ id: it.id, reason: 'NO_SPACE' });
      continue;
    }

    const sp = spaces[best.si];
    const [a, b, c] = best.o;
    const idx = placed.length;
    placed.push({
      id: it.id,
      label: it.label,
      x: sp.x,
      y: sp.y,
      z: sp.z,
      dx: a,
      dy: b,
      dz: c,
      weightKg: it.weightKg,
      stop: it.stop,
      supportId: sp.support >= 0 ? placed[sp.support].id : null,
      supportIdx: sp.support,
      maxLoad: it.maxLoadAboveKg ?? (it.fragile ? 0 : Number.POSITIVE_INFINITY),
      loadAbove: 0,
      item: it,
    });
    for (let k = sp.support; k >= 0; k = placed[k].supportIdx) placed[k].loadAbove += it.weightKg;
    totalWeight += it.weightKg;
    momentY += it.weightKg * (sp.y + b / 2);

    // Guillotine split — the vertical cut is always last so top spaces stay fully supported.
    const restX = sp.dx - a;
    const restY = sp.dy - b;
    const xFirst = strat.split === 'LONGER_FIRST' ? restX >= restY : restX < restY;
    const next: Space[] = [];
    if (xFirst) {
      next.push({ x: sp.x + a, y: sp.y, z: sp.z, dx: restX, dy: sp.dy, dz: sp.dz, support: sp.support });
      next.push({ x: sp.x, y: sp.y + b, z: sp.z, dx: a, dy: restY, dz: sp.dz, support: sp.support });
    } else {
      next.push({ x: sp.x, y: sp.y + b, z: sp.z, dx: sp.dx, dy: restY, dz: sp.dz, support: sp.support });
      next.push({ x: sp.x + a, y: sp.y, z: sp.z, dx: restX, dy: b, dz: sp.dz, support: sp.support });
    }
    next.push({ x: sp.x, y: sp.y, z: sp.z + c, dx: a, dy: b, dz: sp.dz - c, support: idx });

    spaces.splice(best.si, 1);
    for (const s of next) if (s.dx > 1 && s.dy > 1 && s.dz > 1) spaces.push(s);

    // Prune spaces that cannot hold any remaining box
    // (kept cheap: only the global minimum extent among the remaining items)
    spaces = spaces.filter((s) => s.dx > 1 && s.dy > 1 && s.dz > 1);
  }
  return { placed, unplaced, aborted: false };
}

// ── Evaluation ──────────────────────────────────────────────────────────────────

function evaluate(v: Vehicle, placed: Placed[]): Pick<PackResult, 'metrics' | 'violations'> & { cogDev: number } {
  const W = placed.reduce((s, p) => s + p.weightKg, 0);
  let cx = v.length * (v.cogTargetX ?? 0.5);
  let cy = v.width / 2;
  let cz = 0;
  if (W > 0) {
    cx = placed.reduce((s, p) => s + p.weightKg * (p.x + p.dx / 2), 0) / W;
    cy = placed.reduce((s, p) => s + p.weightKg * (p.y + p.dy / 2), 0) / W;
    cz = placed.reduce((s, p) => s + p.weightKg * (p.z + p.dz / 2), 0) / W;
  }

  const hasAxles = v.frontAxleX != null && v.rearAxleX != null && v.rearAxleX > v.frontAxleX;
  const targetX = v.length * (v.cogTargetX ?? (hasAxles ? ((v.frontAxleX! + v.rearAxleX!) / 2) / v.length : 0.5));
  const tolX = (v.cogToleranceX ?? 0.15) * v.length;
  const tolY = (v.cogToleranceY ?? 0.1) * v.width;

  const violations: Array<{ code: string; message: string }> = [];
  const offX = cx - targetX;
  const offY = cy - v.width / 2;
  if (W > 0 && Math.abs(offX) > tolX + EPS) {
    violations.push({ code: 'COG_X_OUT_OF_TOLERANCE', message: `COG is ${Math.round(offX)} cm off target along the vehicle (±${Math.round(tolX)})` });
  }
  if (W > 0 && Math.abs(offY) > tolY + EPS) {
    violations.push({ code: 'COG_Y_OUT_OF_TOLERANCE', message: `COG is ${Math.round(offY)} cm off the centre line (±${Math.round(tolY)})` });
  }

  let front: number | null = null;
  let rear: number | null = null;
  if (hasAxles) {
    const tare = v.tareKg ?? 0;
    const tareX = v.tareCogX ?? v.length / 2;
    const span = v.rearAxleX! - v.frontAxleX!;
    rear = (W * (cx - v.frontAxleX!) + tare * (tareX - v.frontAxleX!)) / span;
    front = W + tare - rear;
    if (v.maxFrontAxleKg != null && front > v.maxFrontAxleKg + EPS) {
      violations.push({ code: 'FRONT_AXLE_OVERLOAD', message: `Front axle ${Math.round(front)} kg > ${v.maxFrontAxleKg} kg` });
    }
    if (v.maxRearAxleKg != null && rear > v.maxRearAxleKg + EPS) {
      violations.push({ code: 'REAR_AXLE_OVERLOAD', message: `Rear axle ${Math.round(rear)} kg > ${v.maxRearAxleKg} kg` });
    }
    if (front < 0) {
      violations.push({ code: 'FRONT_AXLE_UNLOADED', message: 'Front axle would be lifted by the cargo' });
    }
  }

  const volume = placed.reduce((s, p) => s + p.dx * p.dy * p.dz, 0);
  const round = (n: number): number => Math.round(n * 100) / 100;
  return {
    cogDev: Math.abs(offX) / (v.length || 1) + Math.abs(offY) / (v.width || 1),
    violations,
    metrics: {
      volumeUtilizationPct: round((volume / (v.length * v.width * v.height)) * 100),
      loadedWeightKg: round(W),
      payloadUtilizationPct: round((W / v.maxPayloadKg) * 100),
      cog: { x: round(cx), y: round(cy), z: round(cz) },
      cogOffsetXPct: round((offX / v.length) * 100),
      cogOffsetYPct: round((offY / v.width) * 100),
      frontAxleKg: front === null ? null : round(front),
      rearAxleKg: rear === null ? null : round(rear),
    },
  };
}

// ── Public API ──────────────────────────────────────────────────────────────────

export function packVehicle(items: CargoItem[], vehicle: Vehicle, options: PackOptions = {}): PackResult {
  const t0 = performance.now();
  const deadline = t0 + (options.timeLimitMs ?? 5000);

  const strategies: Strategy[] = [];
  for (const balance of [0, 0.5, 1, 2, 4]) {
    for (const ordering of ['VOLUME', 'WEIGHT', 'FOOTPRINT'] as Ordering[]) {
      for (const split of ['LONGER_FIRST', 'SHORTER_FIRST'] as SplitRule[]) {
        strategies.push({ split, ordering, balance });
      }
    }
  }

  let best: { out: RunOutcome; ev: ReturnType<typeof evaluate>; rank: number[] } | null = null;
  let tried = 0;
  for (const strat of strategies) {
    const out = runStrategy(items, vehicle, strat, deadline, tried === 0);
    if (out.aborted) break;
    tried++;
    const ev = evaluate(vehicle, out.placed);
    // feasibility first, then fewest unplaced, then COG closeness, then fullness
    const rank = [ev.violations.length > 0 ? 1 : 0, out.unplaced.length, ev.violations.length, ev.cogDev, -ev.metrics.volumeUtilizationPct];
    if (!best || lexLess(rank, best.rank)) best = { out, ev, rank };
    if (rank[0] === 0 && rank[1] === 0 && ev.cogDev < 0.02) break; // good enough
  }

  const b = best!;
  return {
    placements: b.out.placed.map(({ item: _item, supportIdx: _s, maxLoad: _m, loadAbove: _l, ...pl }) => pl),
    unplaced: b.out.unplaced,
    metrics: b.ev.metrics,
    violations: b.ev.violations,
    feasible: b.ev.violations.length === 0 && b.out.unplaced.length === 0,
    computeMs: Math.round((performance.now() - t0) * 10) / 10,
    strategiesTried: tried,
  };
}

function lexLess(a: number[], b: number[]): boolean {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i] - 1e-12) return true;
    if (a[i] > b[i] + 1e-12) return false;
  }
  return false;
}

/**
 * Independent verifier — re-checks a plan against every geometric/ordering rule.
 * Returns human-readable problems (empty = valid). Used by tests and the API.
 */
export function verifyPlan(items: CargoItem[], v: Vehicle, placements: Placement[]): string[] {
  const problems: string[] = [];
  const byId = new Map(placements.map((p) => [p.id, p]));
  const itemById = new Map(items.map((i) => [i.id, i]));

  for (const p of placements) {
    const it = itemById.get(p.id);
    if (!it) {
      problems.push(`${p.id}: unknown item`);
      continue;
    }
    const dims = [p.dx, p.dy, p.dz].sort((a, b) => a - b);
    const orig = [it.l, it.w, it.h].sort((a, b) => a - b);
    if (dims.some((d, i) => Math.abs(d - orig[i]) > 1e-6)) problems.push(`${p.id}: dimensions changed`);
    if (it.thisSideUp && Math.abs(p.dz - it.h) > 1e-6) problems.push(`${p.id}: this-side-up violated`);
    if (p.x < -EPS || p.y < -EPS || p.z < -EPS || p.x + p.dx > v.length + EPS || p.y + p.dy > v.width + EPS || p.z + p.dz > v.height + EPS) {
      problems.push(`${p.id}: outside the cargo space`);
    }
  }

  for (let i = 0; i < placements.length; i++) {
    const a = placements[i];
    for (let j = i + 1; j < placements.length; j++) {
      const b = placements[j];
      if (overlap(a.x, a.x + a.dx, b.x, b.x + b.dx) && overlap(a.y, a.y + a.dy, b.y, b.y + b.dy) && overlap(a.z, a.z + a.dz, b.z, b.z + b.dz)) {
        problems.push(`${a.id} overlaps ${b.id}`);
      }
    }
  }

  for (const p of placements) {
    if (p.z > EPS) {
      const s = p.supportId ? byId.get(p.supportId) : undefined;
      if (!s || Math.abs(s.z + s.dz - p.z) > 1e-6 || p.x < s.x - EPS || p.y < s.y - EPS || p.x + p.dx > s.x + s.dx + EPS || p.y + p.dy > s.y + s.dy + EPS) {
        problems.push(`${p.id}: not fully supported`);
      } else if (p.weightKg > s.weightKg + EPS) {
        problems.push(`${p.id}: heavier box on a lighter one (${s.id})`);
      } else if (p.stop > s.stop) {
        problems.push(`${p.id}: delivered after the box it stands on (${s.id})`);
      }
    }
  }

  for (const a of placements) {
    for (const b of placements) {
      if (a.id !== b.id && b.stop > a.stop && b.x >= a.x + a.dx - EPS && overlap(a.y, a.y + a.dy, b.y, b.y + b.dy) && overlap(a.z, a.z + a.dz, b.z, b.z + b.dz)) {
        problems.push(`LIFO: ${b.id} (stop ${b.stop}) blocks ${a.id} (stop ${a.stop})`);
      }
    }
  }

  // Max load above (fragile)
  for (const p of placements) {
    const it = itemById.get(p.id)!;
    const limit = it.maxLoadAboveKg ?? (it.fragile ? 0 : Infinity);
    if (!Number.isFinite(limit)) continue;
    let above = 0;
    for (const q of placements) {
      // walk q's support chain
      let cur: Placement | undefined = q.supportId ? byId.get(q.supportId) : undefined;
      while (cur) {
        if (cur.id === p.id) {
          above += q.weightKg;
          break;
        }
        cur = cur.supportId ? byId.get(cur.supportId) : undefined;
      }
    }
    if (above > limit + EPS) problems.push(`${p.id}: carries ${above} kg, limit ${limit} kg`);
  }
  return problems;
}
