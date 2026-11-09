import { classifyAbcXyz, coefficientOfVariation } from '../abc-xyz';
import { hungarian } from '../hungarian';
import { SlotCell, SlotSku, cellDistance, planSlotting, validatePlacement, DEFAULT_LAYOUT } from '../slotting-engine';

function cell(id: string, aisle: string, bay: number, level: number, extra: Partial<SlotCell> = {}): SlotCell {
  return {
    cellId: id, code: `${aisle}-${bay}-${level}`, aisle, bay: String(bay), level: String(level),
    maxWeightKg: 1000, maxVolumeM3: 10, ...extra,
  };
}

function sku(id: string, picks: number, cellId: string, extra: Partial<SlotSku> = {}): SlotSku {
  return {
    productId: id, sku: id.toUpperCase(), picks,
    weeklyUnits: Array(12).fill(picks / 12),
    currentCellId: cellId, stockWeightKg: 10, stockVolumeM3: 0.1, unitWeightKg: 1, ...extra,
  };
}

describe('hungarian', () => {
  it('finds the optimum on a known matrix', () => {
    const c = [
      [9, 2, 7, 8],
      [6, 4, 3, 7],
      [5, 8, 1, 8],
    ];
    const a = hungarian(c);
    const total = a.reduce((s, j, i) => s + c[i][j], 0);
        // brute-force check
    let best = Infinity;
    for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) for (let z = 0; z < 4; z++) {
      if (x === y || y === z || x === z) continue;
      best = Math.min(best, c[0][x] + c[1][y] + c[2][z]);
    }
    expect(total).toBe(best);
  });

  it('matches brute force on random matrices', () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let trial = 0; trial < 20; trial++) {
      const n = 4, m = 6;
      const c = Array.from({ length: n }, () => Array.from({ length: m }, () => Math.floor(rnd() * 50)));
      const a = hungarian(c);
      const got = a.reduce((s, j, i) => s + c[i][j], 0);
      expect(new Set(a).size).toBe(n);
      const perm = (rows: number, used: number[]): number => {
        if (rows === n) return 0;
        let b = Infinity;
        for (let j = 0; j < m; j++) if (!used.includes(j)) b = Math.min(b, c[rows][j] + perm(rows + 1, [...used, j]));
        return b;
      };
      expect(got).toBe(perm(0, []));
    }
  });
});

describe('ABC/XYZ', () => {
  it('classifies by cumulative pick share and demand variability', () => {
    const skus = [
      { productId: 'a', sku: 'A', picks: 850, weeklyUnits: [10, 10, 10, 10] },
      { productId: 'b', sku: 'B', picks: 100, weeklyUnits: [2, 20, 2, 20] },
      { productId: 'c', sku: 'C', picks: 40, weeklyUnits: [0, 0, 0, 40] },
      { productId: 'd', sku: 'D', picks: 10, weeklyUnits: [1, 1, 1, 1] },
    ];
    const { items, matrix } = classifyAbcXyz(skus);
    const by = Object.fromEntries(items.map((i) => [i.item.productId, `${i.abc}${i.xyz}`]));
    expect(by.a).toBe('AX');
    expect(by.b).toBe('BY');
    expect(by.c).toBe('CZ');
    expect(matrix.A.X).toBe(1);
    expect(Object.values(matrix).flatMap((r) => Object.values(r)).reduce((s, v) => s + v, 0)).toBe(4);
  });

  it('cv of constant series is 0 and of zero series is Infinity', () => {
    expect(coefficientOfVariation([5, 5, 5])).toBe(0);
    expect(coefficientOfVariation([0, 0])).toBe(Infinity);
  });
});

describe('validatePlacement (two-level)', () => {
  const s = sku('p', 100, 'x', { stockWeightKg: 500, unitWeightKg: 20 });
  it('hard constraints block', () => {
    const v = validatePlacement(s, cell('c', 'A', 1, 1, { maxWeightKg: 100 }), 'A', 4);
    expect(v.hard.map((h) => h.code)).toContain('OVER_WEIGHT');
  });
  it('soft constraints only warn', () => {
    const v = validatePlacement(s, cell('c', 'A', 1, 4), 'A', 4);
    expect(v.hard).toHaveLength(0);
    expect(v.soft.map((h) => h.code)).toEqual(
      expect.arrayContaining(['HEAVY_ABOVE_WAIST', 'FAST_MOVER_OUTSIDE_GOLDEN_ZONE']),
    );
  });
});

describe('planSlotting', () => {
  // Aisles A..C, 4 bays; distance grows with aisle and bay
  const cells: SlotCell[] = [];
  for (const a of ['A', 'B', 'C']) for (let b = 1; b <= 4; b++) cells.push(cell(`${a}${b}`, a, b, 2));

  it('moves fast movers closer to the dock and reduces travel', () => {
    const skus = [
      sku('slow1', 5, 'A1'), // slow SKU sits in the best cell
      sku('slow2', 8, 'A2'),
      sku('fast', 900, 'C4'), // fast SKU sits in the worst cell
      sku('mid', 100, 'B3'),
    ];
    const plan = planSlotting({ skus, cells, minSavingsM: 1 });
    expect(plan.algorithm).toBe('HUNGARIAN');
    expect(plan.proposedTravelM).toBeLessThan(plan.baselineTravelM);
    expect(plan.reductionPct).toBeGreaterThan(30);
    const fast = plan.moves.find((m) => m.productId === 'fast')!;
    expect(cellDistance(cells.find((c) => c.cellId === fast.toCellId)!, DEFAULT_LAYOUT)).toBeLessThan(
      cellDistance(cells.find((c) => c.cellId === 'C4')!, DEFAULT_LAYOUT),
    );
    // every SKU gets a distinct cell
    const finalCells = skus.map((s) => plan.moves.find((m) => m.productId === s.productId)?.toCellId ?? s.currentCellId);
    expect(new Set(finalCells).size).toBe(skus.length);
  });

  it('is optimal: equals the rearrangement-inequality optimum when unconstrained', () => {
    const skus = [sku('s1', 10, 'C4'), sku('s2', 400, 'C3'), sku('s3', 50, 'C2'), sku('s4', 200, 'C1')];
    const plan = planSlotting({ skus, cells, minSavingsM: 0 });
    const sorted = [...cells].sort((a, b) => cellDistance(a, DEFAULT_LAYOUT) - cellDistance(b, DEFAULT_LAYOUT));
    const picks = skus.map((s) => s.picks).sort((a, b) => b - a);
    const optimum = picks.reduce((sum, p, i) => sum + p * 2 * cellDistance(sorted[i], DEFAULT_LAYOUT), 0);
    expect(plan.proposedTravelM).toBeCloseTo(optimum, 1);
  });

  it('hard constraints block the ideal cell and are reported', () => {
    const tight = cells.map((c) => (c.cellId === 'A1' ? { ...c, maxWeightKg: 5 } : c));
    const skus = [sku('fast', 900, 'C4', { stockWeightKg: 200 }), sku('other', 1, 'B1')];
    const plan = planSlotting({ skus, cells: tight, minSavingsM: 1 });
    const fast = plan.moves.find((m) => m.productId === 'fast')!;
    expect(fast.toCellId).not.toBe('A1');
    expect(plan.blocked.find((b) => b.productId === 'fast')!.reasons[0].code).toBe('OVER_WEIGHT');
  });

  it('soft constraints surface as warnings on the move, not as blocks', () => {
    const levels = cells.map((c) => (c.cellId === 'A1' ? { ...c, level: '4' } : { ...c, level: '2' }));
    const skus = [sku('fast', 900, 'C4', { unitWeightKg: 30 }), sku('o', 1, 'B1')];
    const plan = planSlotting({ skus, cells: levels, minSavingsM: 1 });
    const fast = plan.moves.find((m) => m.productId === 'fast')!;
    expect(fast.toCellId).toBe('A1');
    expect(fast.warnings.map((w) => w.code)).toContain('HEAVY_ABOVE_WAIST');
  });

  it('does not relocate volatile (Z) SKUs for marginal gains', () => {
    const stable = sku('stable', 40, 'A2'); // X
    const volatile = sku('volatile', 40, 'A1', { weeklyUnits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 120] }); // Z
    const plan = planSlotting({ skus: [stable, volatile], cells, minSavingsM: 40 });
    // swap would save only a little → below threshold for Z (2.5×)
    expect(plan.moves.find((m) => m.productId === 'volatile')).toBeUndefined();
  });

  it('falls back to greedy for large inputs and stays feasible', () => {
    const skus = [sku('a', 500, 'C4'), sku('b', 50, 'A1'), sku('c', 5, 'B2')];
    const plan = planSlotting({ skus, cells, exactLimit: 2, minSavingsM: 1 });
    expect(plan.algorithm).toBe('GREEDY');
    expect(plan.proposedTravelM).toBeLessThanOrEqual(plan.baselineTravelM);
    const finalCells = skus.map((s) => plan.moves.find((m) => m.productId === s.productId)?.toCellId ?? s.currentCellId);
    expect(new Set(finalCells).size).toBe(3);
  });
});
