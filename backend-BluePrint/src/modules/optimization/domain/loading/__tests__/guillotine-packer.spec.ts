import { CargoItem, Vehicle, packVehicle, verifyPlan } from '../guillotine-packer';

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

// Euro van box body 4.2 × 2.1 × 2.1 m
const VAN: Vehicle = {
  length: 420,
  width: 210,
  height: 210,
  maxPayloadKg: 1500,
  frontAxleX: 60,
  rearAxleX: 330,
  maxFrontAxleKg: 1800,
  maxRearAxleKg: 2000,
  tareKg: 2200,
  tareCogX: 190, // empty van is ≈ 50/50 on its axles
};

function randomCargo(n: number, seed: number, stops = 6): CargoItem[] {
  const r = rng(seed);
  return Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    l: 30 + Math.floor(r() * 50),
    w: 25 + Math.floor(r() * 40),
    h: 20 + Math.floor(r() * 40),
    weightKg: 2 + Math.floor(r() * 25),
    stop: 1 + Math.floor(r() * stops),
  }));
}

describe('packVehicle', () => {
  it('packs 50 mixed boxes in ≤ 5 s with a fully valid plan', () => {
    const items = randomCargo(50, 42);
    const res = packVehicle(items, VAN);
    expect(res.computeMs).toBeLessThan(5000);
    expect(res.unplaced).toHaveLength(0);
    expect(res.placements).toHaveLength(50);
    expect(verifyPlan(items, VAN, res.placements)).toEqual([]);
  });

  it('is valid across many random instances (no overlap, support, heavy-over-light, LIFO)', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const items = randomCargo(40 + (seed % 4) * 5, seed * 7919);
      const res = packVehicle(items, VAN, { timeLimitMs: 2000 });
      expect(verifyPlan(items, VAN, res.placements)).toEqual([]);
    }
  });

  it('respects the time limit', () => {
    const items = randomCargo(50, 5);
    const res = packVehicle(items, VAN, { timeLimitMs: 1 });
    expect(res.strategiesTried).toBeGreaterThanOrEqual(1);
    expect(res.placements.length).toBeGreaterThan(0);
    expect(verifyPlan(items, VAN, res.placements)).toEqual([]);
  });

  it('uses rotation: a long box fits only when turned', () => {
    const v: Vehicle = { length: 100, width: 50, height: 50, maxPayloadKg: 100 };
    const res = packVehicle([{ id: 'x', l: 40, w: 90, h: 40, weightKg: 5, stop: 1 }], v);
    expect(res.unplaced).toHaveLength(0);
    expect(res.placements[0].dx).toBe(90);
  });

  it('honours “this side up”', () => {
    const v: Vehicle = { length: 100, width: 50, height: 50, maxPayloadKg: 100 };
    // 40×90×40 could only fit lying with w along x — still possible keeping h=40 vertical
    const items: CargoItem[] = [{ id: 'x', l: 40, w: 90, h: 40, weightKg: 5, stop: 1, thisSideUp: true }];
    const res = packVehicle(items, v);
    expect(res.placements[0].dz).toBe(40);
    // 60 tall cannot stand: only fits on its side, which is forbidden
    const tall = packVehicle([{ id: 't', l: 80, w: 40, h: 60, weightKg: 5, stop: 1, thisSideUp: true }], v);
    expect(tall.unplaced[0].reason).toBe('TOO_LARGE');
  });

  it('never puts a heavy box on a light one', () => {
    const v: Vehicle = { length: 60, width: 60, height: 120, maxPayloadKg: 1000 };
    const items: CargoItem[] = [
      { id: 'light', l: 60, w: 60, h: 40, weightKg: 5, stop: 1 },
      { id: 'heavy', l: 60, w: 60, h: 40, weightKg: 80, stop: 1 },
    ];
    const res = packVehicle(items, v);
    const heavy = res.placements.find((p) => p.id === 'heavy')!;
    const light = res.placements.find((p) => p.id === 'light')!;
    expect(heavy.z).toBe(0);
    expect(light.supportId).toBe('heavy');
    expect(verifyPlan(items, v, res.placements)).toEqual([]);
  });

  it('refuses to stack on fragile boxes', () => {
    const v: Vehicle = { length: 60, width: 60, height: 120, maxPayloadKg: 1000 };
    const items: CargoItem[] = [
      { id: 'glass', l: 60, w: 60, h: 40, weightKg: 50, stop: 1, fragile: true },
      { id: 'box', l: 60, w: 60, h: 40, weightKg: 10, stop: 1 },
    ];
    const res = packVehicle(items, v);
    expect(res.placements.find((p) => p.id === 'glass')).toBeDefined();
    expect(res.placements.find((p) => p.supportId === 'glass')).toBeUndefined();
    // one of the two cannot stand on the floor → unplaced or beside; plan stays valid
    expect(verifyPlan(items, v, res.placements)).toEqual([]);
  });

  it('LIFO: first drop is closest to the door, last drop deepest', () => {
    const v: Vehicle = { length: 300, width: 60, height: 60, maxPayloadKg: 1000 };
    const items: CargoItem[] = [1, 2, 3].map((s) => ({ id: `s${s}`, l: 80, w: 60, h: 60, weightKg: 20, stop: s }));
    const res = packVehicle(items, v);
    const x = (id: string) => res.placements.find((p) => p.id === id)!.x;
    expect(x('s3')).toBeLessThan(x('s2'));
    expect(x('s2')).toBeLessThan(x('s1'));
    expect(verifyPlan(items, v, res.placements)).toEqual([]);
  });

  it('enforces the payload limit', () => {
    const v: Vehicle = { length: 400, width: 200, height: 200, maxPayloadKg: 100 };
    const items: CargoItem[] = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, l: 50, w: 50, h: 50, weightKg: 30, stop: 1 }));
    const res = packVehicle(items, v);
    expect(res.metrics.loadedWeightKg).toBeLessThanOrEqual(100);
    expect(res.unplaced.every((u) => u.reason === 'PAYLOAD_EXCEEDED')).toBe(true);
    expect(res.unplaced).toHaveLength(2);
  });

  it('keeps the centre of gravity and axle loads inside limits when possible', () => {
    const items = randomCargo(45, 99);
    const res = packVehicle(items, VAN);
    expect(res.feasible).toBe(true);
    expect(Math.abs(res.metrics.cogOffsetYPct)).toBeLessThanOrEqual(10);
    expect(res.metrics.frontAxleKg!).toBeLessThanOrEqual(1800);
    expect(res.metrics.rearAxleKg!).toBeLessThanOrEqual(2000);
    // axle loads must add up to cargo + tare
    expect(res.metrics.frontAxleKg! + res.metrics.rearAxleKg!).toBeCloseTo(res.metrics.loadedWeightKg + 2200, 0);
  });

  it('reports an axle violation when cargo is too concentrated to balance', () => {
    const v: Vehicle = { ...VAN }; // 1500 kg at the front wall pushes the front axle far past 1800 kg
    const items: CargoItem[] = [{ id: 'dense', l: 100, w: 100, h: 100, weightKg: 1500, stop: 1 }];
    const res = packVehicle(items, v);
    expect(res.placements).toHaveLength(1);
    expect(res.violations.some((x) => x.code.includes('AXLE') || x.code.includes('COG'))).toBe(true);
    expect(res.feasible).toBe(false);
  });
});
