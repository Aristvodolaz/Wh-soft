import {
  AbcClass,
  AbcXyzMatrix,
  AbcXyzThresholds,
  Classified,
  DEFAULT_THRESHOLDS,
  SkuDemand,
  XyzClass,
  classifyAbcXyz,
} from './abc-xyz';
import { hungarian } from './hungarian';

// ── Types ───────────────────────────────────────────────────────────────────────

export interface SlotCell {
  cellId: string;
  code: string;
  aisle: string | null;
  bay: string | null;
  level: string | null;
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
}

export interface SlotSku extends SkuDemand {
  currentCellId: string;
  /** Total weight / volume of the stock that sits in the pick cell (what must fit). */
  stockWeightKg: number | null;
  stockVolumeM3: number | null;
  /** Weight of one unit — drives ergonomics (lifting) rules. */
  unitWeightKg: number | null;
}

export interface LayoutParams {
  /** Distance between neighbouring aisles, m. */
  aisleSpacing: number;
  /** Length of one bay along the aisle, m. */
  bayLength: number;
}

export interface ErgonomicRules {
  /** Units heavier than this should not be stored above `maxHeavyLevel`. */
  heavyKg: number;
  maxHeavyLevel: number;
  /** Levels considered the “golden zone” for fast movers (inclusive). */
  goldenFrom: number;
  goldenTo: number;
}

export interface Violation {
  code: string;
  message: string;
}

export interface PlacementCheck {
  /** Hard constraints — a violation BLOCKS the assignment. */
  hard: Violation[];
  /** Soft constraints — a violation only produces a warning. */
  soft: Violation[];
}

export interface SlottingMove {
  productId: string;
  sku: string;
  abc: AbcClass;
  xyz: XyzClass;
  fromCellId: string;
  toCellId: string;
  fromCode: string;
  toCode: string;
  /** Travel saved inside the observation window, metres. */
  savedTravelM: number;
  warnings: Violation[];
}

export interface BlockedCandidate {
  productId: string;
  sku: string;
  idealCellId: string;
  idealCode: string;
  reasons: Violation[];
}

export interface SlottingPlan {
  algorithm: 'HUNGARIAN' | 'GREEDY';
  matrix: AbcXyzMatrix;
  classified: Array<{ productId: string; sku: string; abc: AbcClass; xyz: XyzClass; cv: number | null; picks: number }>;
  baselineTravelM: number;
  proposedTravelM: number;
  savedTravelM: number;
  reductionPct: number;
  moves: SlottingMove[];
  /** SKUs whose ideal (nearest) cell was refused by a hard constraint. */
  blocked: BlockedCandidate[];
  skippedSkus: Array<{ productId: string; sku: string; reason: string }>;
}

export interface SlottingInput {
  skus: SlotSku[];
  cells: SlotCell[];
  layout?: Partial<LayoutParams>;
  rules?: Partial<ErgonomicRules>;
  thresholds?: Partial<AbcXyzThresholds>;
  /** Minimum travel saving (m/window) to justify relocating an X-class SKU. */
  minSavingsM?: number;
  /** Max SKUs for exact (Hungarian) solving; above this the greedy fallback runs. */
  exactLimit?: number;
}

export const DEFAULT_LAYOUT: LayoutParams = { aisleSpacing: 3, bayLength: 1.2 };
export const DEFAULT_RULES: ErgonomicRules = { heavyKg: 15, maxHeavyLevel: 2, goldenFrom: 2, goldenTo: 3 };

/** Relocating volatile SKUs is costlier/riskier → require a proportionally bigger saving. */
const XYZ_HYSTERESIS: Record<XyzClass, number> = { X: 1, Y: 1.5, Z: 2.5 };
const FORBIDDEN = 1e9;

// ── Geometry ────────────────────────────────────────────────────────────────────

function ordinal(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const v = value.trim();
  if (/^[A-Za-z]$/.test(v)) return v.toUpperCase().charCodeAt(0) - 65;
  const n = parseInt(v.replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? fallback : n;
}

/**
 * One-way walking distance from the dock (0,0) to the cell, rectilinear:
 * along the cross-aisle to the aisle, then up the aisle to the bay.
 */
export function cellDistance(cell: SlotCell, layout: LayoutParams): number {
  const aisle = ordinal(cell.aisle, 0);
  const bay = Math.max(ordinal(cell.bay, 1), 1);
  return aisle * layout.aisleSpacing + (bay - 0.5) * layout.bayLength;
}

export function cellLevel(cell: SlotCell): number {
  return Math.max(ordinal(cell.level, 1), 1);
}

// ── Two-level validation ────────────────────────────────────────────────────────

export function validatePlacement(
  sku: SlotSku,
  cell: SlotCell,
  abc: AbcClass,
  maxLevel: number,
  rules: ErgonomicRules = DEFAULT_RULES,
): PlacementCheck {
  const hard: Violation[] = [];
  const soft: Violation[] = [];

  // Level 1 — hard (physical) constraints
  if (cell.maxWeightKg != null && sku.stockWeightKg != null && sku.stockWeightKg > cell.maxWeightKg) {
    hard.push({
      code: 'OVER_WEIGHT',
      message: `Stock weight ${sku.stockWeightKg} kg exceeds cell capacity ${cell.maxWeightKg} kg`,
    });
  }
  if (cell.maxVolumeM3 != null && sku.stockVolumeM3 != null && sku.stockVolumeM3 > cell.maxVolumeM3) {
    hard.push({
      code: 'OVER_VOLUME',
      message: `Stock volume ${sku.stockVolumeM3} m³ exceeds cell volume ${cell.maxVolumeM3} m³`,
    });
  }

  // Level 2 — soft (ergonomic) constraints
  const level = cellLevel(cell);
  if (sku.unitWeightKg != null && sku.unitWeightKg > rules.heavyKg && level > rules.maxHeavyLevel) {
    soft.push({
      code: 'HEAVY_ABOVE_WAIST',
      message: `Unit weight ${sku.unitWeightKg} kg stored on level ${level} (limit ${rules.maxHeavyLevel})`,
    });
  }
  if (abc === 'A' && maxLevel >= 3 && (level < rules.goldenFrom || level > rules.goldenTo)) {
    soft.push({
      code: 'FAST_MOVER_OUTSIDE_GOLDEN_ZONE',
      message: `A-class SKU on level ${level}; golden zone is levels ${rules.goldenFrom}–${rules.goldenTo}`,
    });
  }
  return { hard, soft };
}

// ── Planner ─────────────────────────────────────────────────────────────────────

export function planSlotting(input: SlottingInput): SlottingPlan {
  const layout = { ...DEFAULT_LAYOUT, ...input.layout };
  const rules = { ...DEFAULT_RULES, ...input.rules };
  const thresholds = { ...DEFAULT_THRESHOLDS, ...input.thresholds };
  const minSavings = input.minSavingsM ?? 10;
  const exactLimit = input.exactLimit ?? 250;

  const cellById = new Map(input.cells.map((c) => [c.cellId, c]));
  const skipped: SlottingPlan['skippedSkus'] = [];
  const skus: SlotSku[] = [];
  for (const s of input.skus) {
    if (cellById.has(s.currentCellId)) skus.push(s);
    else skipped.push({ productId: s.productId, sku: s.sku, reason: 'Current cell is not an eligible storage cell' });
  }

  const { items: classified, matrix } = classifyAbcXyz(skus, thresholds);
  const maxLevel = input.cells.reduce((m, c) => Math.max(m, cellLevel(c)), 1);
  const dist = new Map(input.cells.map((c) => [c.cellId, cellDistance(c, layout)]));
  const travel = (picks: number, cellId: string): number => picks * 2 * (dist.get(cellId) ?? 0);

  const n = classified.length;
  const cells = input.cells;
  const exact = n <= exactLimit && n <= cells.length;

  // check[i][j] cached lazily
  const checks = new Map<string, PlacementCheck>();
  const check = (i: number, cellIdx: number): PlacementCheck => {
    const key = `${i}:${cellIdx}`;
    let c = checks.get(key);
    if (!c) {
      c = validatePlacement(classified[i].item, cells[cellIdx], classified[i].abc, maxLevel, rules);
      checks.set(key, c);
    }
    return c;
  };
  const cellIndex = new Map(cells.map((c, idx) => [c.cellId, idx]));
  const currentIdx = classified.map((c) => cellIndex.get(c.item.currentCellId)!);

  let assignment: number[];

  if (exact && n > 0) {
    const cost: number[][] = classified.map((c, i) =>
      cells.map((cell, j) => {
        if (j === currentIdx[i]) return travel(c.item.picks, cell.cellId); // reality is always allowed
        if (check(i, j).hard.length) return FORBIDDEN;
        // Relocation has a price (labour + risk); volatile SKUs pay more. A move therefore
        // happens only if its travel saving beats that price — ties never cause churn.
        const price = Math.max(minSavings, 1e-3) * XYZ_HYSTERESIS[c.xyz];
        return travel(c.item.picks, cell.cellId) + price;
      }),
    );
    assignment = hungarian(cost);
  } else {
    // Greedy: highest-demand first, nearest feasible free cell. Cells that are the
    // current location of a not-yet-processed SKU stay reserved so every SKU keeps a fallback.
    assignment = new Array(n).fill(-1);
    const taken = new Set<number>();
    const reserved = new Map<number, number>(); // cellIdx → owner row
    currentIdx.forEach((cIdx, i) => reserved.set(cIdx, i));
    const byDistance = cells.map((_, j) => j).sort((a, b) => (dist.get(cells[a].cellId)! - dist.get(cells[b].cellId)!));
    const order = classified.map((_, i) => i); // already sorted by picks desc
    for (const i of order) {
      let pick = currentIdx[i];
      for (const j of byDistance) {
        if (taken.has(j)) continue;
        const owner = reserved.get(j);
        if (owner !== undefined && owner !== i) continue;
        if (j !== currentIdx[i] && check(i, j).hard.length) continue;
        pick = j;
        break;
      }
      assignment[i] = pick;
      taken.add(pick);
      reserved.delete(currentIdx[i]); // vacated → available to the lower-priority SKUs
      if (pick === currentIdx[i]) reserved.set(currentIdx[i], i);
    }
  }

  // Hysteresis: drop relocations whose saving does not justify the move (esp. for Y/Z SKUs).
  const occupant = new Map<number, number>();
  assignment.forEach((j, i) => occupant.set(j, i));
  const saving = (i: number): number =>
    travel(classified[i].item.picks, cells[currentIdx[i]].cellId) - travel(classified[i].item.picks, cells[assignment[i]].cellId);
  let changed = true;
  while (changed) {
    changed = false;
    const candidates = assignment
      .map((j, i) => ({ i, j }))
      .filter(({ i, j }) => j !== currentIdx[i])
      .sort((a, b) => saving(a.i) - saving(b.i));
    for (const { i, j } of candidates) {
      const need = minSavings * XYZ_HYSTERESIS[classified[i].xyz];
      if (saving(i) >= need) continue;
      const back = currentIdx[i];
      if (occupant.has(back) && occupant.get(back) !== i) continue; // someone moved in
      occupant.delete(j);
      assignment[i] = back;
      occupant.set(back, i);
      changed = true;
    }
  }

  // Build the report
  const moves: SlottingMove[] = [];
  let baseline = 0;
  let proposed = 0;
  const blocked: BlockedCandidate[] = [];
  classified.forEach((c, i) => {
    const from = cells[currentIdx[i]];
    const to = cells[assignment[i]];
    baseline += travel(c.item.picks, from.cellId);
    proposed += travel(c.item.picks, to.cellId);

    if (assignment[i] !== currentIdx[i]) {
      moves.push({
        productId: c.item.productId,
        sku: c.item.sku,
        abc: c.abc,
        xyz: c.xyz,
        fromCellId: from.cellId,
        toCellId: to.cellId,
        fromCode: from.code,
        toCode: to.code,
        savedTravelM: round(travel(c.item.picks, from.cellId) - travel(c.item.picks, to.cellId)),
        warnings: check(i, assignment[i]).soft,
      });
    }

    // Which SKUs were stopped by a hard constraint from taking their ideal cell?
    if (c.item.picks > 0) {
      let ideal = -1;
      for (let j = 0; j < cells.length; j++) {
        if (ideal === -1 || dist.get(cells[j].cellId)! < dist.get(cells[ideal].cellId)!) ideal = j;
      }
      if (ideal !== -1 && dist.get(cells[ideal].cellId)! < dist.get(to.cellId)!) {
        const v = check(i, ideal);
        if (v.hard.length) {
          blocked.push({ productId: c.item.productId, sku: c.item.sku, idealCellId: cells[ideal].cellId, idealCode: cells[ideal].code, reasons: v.hard });
        }
      }
    }
  });

  moves.sort((a, b) => b.savedTravelM - a.savedTravelM);
  return {
    algorithm: exact ? 'HUNGARIAN' : 'GREEDY',
    matrix,
    classified: classified.map((c: Classified<SlotSku>) => ({
      productId: c.item.productId,
      sku: c.item.sku,
      abc: c.abc,
      xyz: c.xyz,
      cv: Number.isFinite(c.cv) ? round(c.cv) : null,
      picks: c.item.picks,
    })),
    baselineTravelM: round(baseline),
    proposedTravelM: round(proposed),
    savedTravelM: round(baseline - proposed),
    reductionPct: baseline > 0 ? round(((baseline - proposed) / baseline) * 100) : 0,
    moves,
    blocked,
    skippedSkus: skipped,
  };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
