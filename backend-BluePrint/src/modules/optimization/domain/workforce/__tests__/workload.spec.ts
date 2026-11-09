import {
  DEFAULT_NORMS,
  TaskObservation,
  calibrateNorms,
  forecastWorkload,
  normMinutes,
  ols,
  personalCoefficients,
} from '../workload';

function obs(userId: string, type: string, q: number | null, dur: number, shift: string): TaskObservation {
  return { userId, type, quantity: q, durationMin: dur, shiftKey: shift };
}

describe('ols', () => {
  it('recovers an exact line', () => {
    const xs = [1, 2, 3, 4, 5];
    const r = ols(xs, xs.map((x) => 2 + 3 * x));
    expect(r.a).toBeCloseTo(2, 6);
    expect(r.b).toBeCloseTo(3, 6);
    expect(r.r2).toBeCloseTo(1, 6);
  });

  it('constrains a negative intercept (refit through origin) and negative slope', () => {
    const r1 = ols([1, 2, 3, 4], [0.5, 2.5, 4.5, 6.5]); // a = -1.5
    expect(r1.a).toBe(0);
    expect(r1.b).toBeGreaterThan(0);
    const r2 = ols([1, 2, 3, 4], [10, 8, 6, 4]);
    expect(r2.b).toBe(0);
    expect(r2.a).toBeCloseTo(7, 6);
  });

  it('constant x → constant duration', () => {
    expect(ols([1, 1, 1], [3, 5, 4])).toEqual({ a: 4, b: 0, r2: null });
  });
});

describe('calibrateNorms', () => {
  const syntheticPick = (n: number) =>
    Array.from({ length: n }, (_, i) => {
      const q = 1 + (i % 20);
      return obs('u1', 'PICK', q, 4 + 0.9 * q, `2026-03-${String(1 + (i % 28)).padStart(2, '0')}`);
    });

  it('calibrates to warehouse data when there is plenty of it', () => {
    const norms = calibrateNorms(syntheticPick(400));
    expect(norms.PICK.base).toBeCloseTo(4, 0);
    expect(norms.PICK.perUnit).toBeCloseTo(0.9, 1);
    expect(norms.PICK.source).toBe('REGRESSION');
    expect(norms.PICK.r2).toBeGreaterThan(0.99);
  });

  it('keeps defaults when samples are scarce', () => {
    const norms = calibrateNorms(syntheticPick(5));
    expect(norms.PICK.source).toBe('DEFAULT');
    expect(norms.PICK.base).toBe(DEFAULT_NORMS.PICK.base);
    expect(norms.PACK.source).toBe('DEFAULT');
  });

  it('shrinks towards defaults with moderate data', () => {
    const norms = calibrateNorms(syntheticPick(12));
    expect(norms.PICK.base).toBeGreaterThan(DEFAULT_NORMS.PICK.base);
    expect(norms.PICK.base).toBeLessThan(4);
  });

  it('ignores outliers (e.g. a task left open overnight)', () => {
    const clean = syntheticPick(100);
    const polluted = [...clean, obs('u1', 'PICK', 5, 470, '2026-03-02')];
    expect(calibrateNorms(polluted).PICK.perUnit).toBeCloseTo(calibrateNorms(clean).PICK.perUnit, 6);
  });
});

describe('personalCoefficients', () => {
  const norms = { PICK: { base: 2, perUnit: 0.5 } };
  const make = (userId: string, factor: number, shifts: number, perShift = 6): TaskObservation[] => {
    const out: TaskObservation[] = [];
    for (let s = 0; s < shifts; s++) {
      for (let i = 0; i < perShift; i++) {
        const q = 4;
        out.push(obs(userId, 'PICK', q, normMinutes(norms, 'PICK', q) * factor, `2026-02-${String(s + 1).padStart(2, '0')}`));
      }
    }
    return out;
  };

  it('is fact / norm for an experienced employee', () => {
    const c = personalCoefficients([...make('slow', 1.4, 30)], norms);
    expect(c.get('slow')!.coefficient).toBeGreaterThan(1.35);
    expect(c.get('slow')!.coefficient).toBeLessThan(1.41);
    const f = personalCoefficients([...make('fast', 0.8, 30)], norms);
    expect(f.get('fast')!.coefficient).toBeLessThan(0.85);
  });

  it('uses only the last 30 shifts', () => {
    const old = make('u', 2, 10).map((o) => ({ ...o, shiftKey: '2025-01-' + o.shiftKey.slice(-2) }));
    const recent = make('u', 1, 30);
    const c = personalCoefficients([...old, ...recent], norms);
    expect(c.get('u')!.shiftsUsed).toBe(30);
    expect(c.get('u')!.coefficient).toBeCloseTo(1, 1);
  });

  it('a newcomer is pulled towards 1 and clamped', () => {
    const c = personalCoefficients(make('new', 2, 1, 2), norms);
    expect(c.get('new')!.coefficient).toBeLessThan(1.3);
    const extreme = personalCoefficients(make('x', 10, 30), norms);
    expect(extreme.get('x')!.coefficient).toBeLessThanOrEqual(2);
  });
});

describe('forecastWorkload', () => {
  const norms = { PICK: { base: 2, perUnit: 0.5 }, PACK: { base: 1, perUnit: 0 } };
  const employees = [
    { userId: 'a', name: 'Alice' },
    { userId: 'b', name: 'Bob' },
  ];
  const coefs = new Map([
    ['a', { userId: 'a', coefficient: 0.8, shiftsUsed: 30, tasksUsed: 100 }],
    ['b', { userId: 'b', coefficient: 1.5, shiftsUsed: 30, tasksUsed: 100 }],
  ]);

  it('applies personal coefficients to assigned work and the average to unassigned', () => {
    const tasks = [
      { id: '1', type: 'PICK', quantity: 4, assignedTo: 'a', dueDay: '2026-03-17' }, // 4 min × 0.8
      { id: '2', type: 'PICK', quantity: 4, assignedTo: 'b', dueDay: '2026-03-17' }, // 4 min × 1.5
      { id: '3', type: 'PACK', quantity: null, assignedTo: null, dueDay: null }, // 1 × avg 1.15
    ];
    const [d] = forecastWorkload({ tasks, employees, norms, coefficients: coefs, today: '2026-03-17' });
    expect(d.normMinutes).toBe(9);
    expect(Math.abs(d.projectedMinutes - (4 * 0.8 + 4 * 1.5 + 1.15))).toBeLessThan(0.06);
    expect(d.employees.find((e) => e.userId === 'b')!.projectedMinutes).toBe(6);
  });

  it('flags overload and computes the shortage of people', () => {
    const tasks = Array.from({ length: 200 }, (_, i) => ({
      id: String(i), type: 'PICK', quantity: 10, assignedTo: null, dueDay: '2026-03-17',
    }));
    const [d] = forecastWorkload({ tasks, employees, norms, coefficients: coefs, today: '2026-03-17' });
    expect(d.status).toBe('OVERLOAD');
    expect(d.fteNeeded).toBeGreaterThan(2);
    expect(d.fteShortage).toBeGreaterThan(0);
  });

  it('moves overdue tasks to today and buckets by day', () => {
    const tasks = [
      { id: '1', type: 'PACK', quantity: null, assignedTo: null, dueDay: '2026-03-10' },
      { id: '2', type: 'PACK', quantity: null, assignedTo: null, dueDay: '2026-03-19' },
    ];
    const days = forecastWorkload({ tasks, employees, norms, coefficients: coefs, today: '2026-03-17' });
    expect(days.map((d) => d.day)).toEqual(['2026-03-17', '2026-03-19']);
  });
});
