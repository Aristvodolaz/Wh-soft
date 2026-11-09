import { MemoryStore } from '../memory-store'
import { OfflineTerminal } from '../terminal'
import { SyncEngine } from '../sync-engine'
import type { LocalTask, OutboxEntry, PullResponse, PushResponse, SyncTransport } from '../types'

const task = (id: string, status = 'ASSIGNED', extra: Partial<LocalTask> = {}): LocalTask => ({
  id,
  warehouseId: 'w1',
  type: 'PICK',
  status,
  priority: 'NORMAL',
  title: `Task ${id}`,
  assignedTo: 'u1',
  fromCellId: null,
  toCellId: null,
  productId: null,
  quantity: 3,
  notes: null,
  dueAt: null,
  updatedAt: '2026-03-17T10:00:00Z',
  ...extra,
})

/** A fake server with the same idempotency ledger as the real one + a switchable network. */
class FakeServer implements SyncTransport {
  ledger = new Map<string, { outcome: 'APPLIED' | 'REJECTED'; error?: { code: string; message: string } }>()
  applied: string[] = []
  networkUp = true
  /** When true the request reaches the server but the ACK is lost. */
  dropAck = false
  rejectTypes = new Set<string>()
  tasks: LocalTask[] = []
  full = true
  calls: string[][] = []

  async push(_d: string, ops: Array<Pick<OutboxEntry, 'opId' | 'type' | 'payload'>>): Promise<PushResponse> {
    if (!this.networkUp) throw new Error('offline')
    this.calls.push(ops.map((o) => o.opId))
    const results = ops.map((o) => {
      const seen = this.ledger.get(o.opId)
      if (seen) return { opId: o.opId, outcome: seen.outcome === 'REJECTED' ? ('REJECTED' as const) : ('DUPLICATE' as const), error: seen.error }
      if (this.rejectTypes.has(o.type)) {
        const error = { code: 'UNPROCESSABLE_ENTITY', message: 'refused' }
        this.ledger.set(o.opId, { outcome: 'REJECTED', error })
        return { opId: o.opId, outcome: 'REJECTED' as const, error }
      }
      this.ledger.set(o.opId, { outcome: 'APPLIED' })
      this.applied.push(o.opId)
      return { opId: o.opId, outcome: 'APPLIED' as const }
    })
    if (this.dropAck) {
      this.dropAck = false
      throw new Error('timeout')
    }
    return { serverTime: new Date().toISOString(), results }
  }

  async pull(): Promise<PullResponse> {
    if (!this.networkUp) throw new Error('offline')
    return {
      cursor: '2026-03-17T12:00:00Z',
      full: this.full,
      tasks: this.tasks,
      catalog: {
        products: [{ id: 'p1', sku: 'SKU-1', name: 'Bolt', barcode: '4600000000011', isActive: true }],
        cells: [{ id: 'c1', code: 'A-01-1', barcode: 'CELL-A011', isActive: true }],
      },
    }
  }
}

function setup(opts: { random?: () => number } = {}) {
  let t = 1_000_000
  let n = 0
  const store = new MemoryStore()
  const server = new FakeServer()
  const clock = { now: () => t, advance: (ms: number) => (t += ms) }
  const terminal = new OfflineTerminal({ store, newId: () => `op-${++n}`, now: () => new Date(t) })
  const engine = new SyncEngine({
    store,
    transport: server,
    deviceId: 'tsd-1',
    now: clock.now,
    random: opts.random ?? (() => 1),
    baseDelayMs: 1000,
  })
  return { store, server, clock, terminal, engine }
}

const seed = async (store: MemoryStore, ...tasks: LocalTask[]) => {
  await store.transaction(['tasks'], async (tx) => {
    for (const t of tasks) await tx.put('tasks', t.id, t)
  })
}

describe('MemoryStore transactions', () => {
  it('rolls back every write when the transaction throws', async () => {
    const store = new MemoryStore()
    await expect(
      store.transaction(['tasks', 'outbox'], async (tx) => {
        await tx.put('tasks', 'a', { v: 1 })
        await tx.put('outbox', 'x', { v: 2 })
        throw new Error('battery died')
      }),
    ).rejects.toThrow('battery died')
    const all = await store.transaction(['tasks', 'outbox'], async (tx) => [
      ...(await tx.getAll('tasks')),
      ...(await tx.getAll('outbox')),
    ])
    expect(all).toEqual([])
  })
})

describe('Transactional outbox', () => {
  it('state change and outbox row are written together', async () => {
    const { store, terminal } = setup()
    await seed(store, task('t1'))
    await terminal.startTask('t1')

    const [local] = await terminal.myTasks()
    expect(local.status).toBe('IN_PROGRESS')
    const out = await store.transaction(['outbox'], (tx) => tx.getAll<OutboxEntry>('outbox'))
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ type: 'TASK_START', payload: { taskId: 't1' }, status: 'PENDING' })
  })

  it('a refused local transition writes nothing', async () => {
    const { store, terminal } = setup()
    await seed(store, task('t1', 'ASSIGNED'))
    await expect(terminal.completeTask('t1')).rejects.toThrow(/IN_PROGRESS/);
    expect(await store.transaction(['outbox'], (tx) => tx.getAll('outbox'))).toHaveLength(0)
  })

  it('keeps operation order with a monotonic sequence', async () => {
    const { store, terminal } = setup()
    await seed(store, task('t1'))
    const a = await terminal.startTask('t1')
    const b = await terminal.completeTask('t1')
    expect(b.seq).toBeGreaterThan(a.seq)
  })
})

describe('SyncEngine.flush', () => {
  it('delivers the outbox in order and empties it', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('t1'))
    const a = await terminal.startTask('t1')
    const b = await terminal.completeTask('t1')

    const s = await engine.flush()
    expect(s).toMatchObject({ applied: 2, offline: false })
    expect(server.applied).toEqual([a.opId, b.opId])
    expect(await engine.pendingCount()).toBe(0)
  })

  it('works through a dead zone: keeps rows, backs off, resends the SAME opId later', async () => {
    const { store, server, clock, terminal, engine } = setup()
    await seed(store, task('t1'))
    const op = await terminal.startTask('t1')
    server.networkUp = false

    expect((await engine.flush()).offline).toBe(true)
    expect(await engine.pendingCount()).toBe(1)

    // Still backing off → nothing is attempted
    server.networkUp = true
    expect((await engine.flush()).sent).toBe(0)

    clock.advance(60_000)
    const s = await engine.flush()
    expect(s.applied).toBe(1)
    expect(server.calls.flat().every((id) => id === op.opId)).toBe(true)
  })

  it('exponential backoff grows and is capped, with jitter', () => {
    const { engine } = setup({ random: () => 1 })
    expect(engine.backoff(1)).toBe(2000)
    expect(engine.backoff(2)).toBe(4000)
    expect(engine.backoff(30)).toBe(5 * 60_000)
    const lo = setup({ random: () => 0 }).engine
    expect(lo.backoff(2)).toBe(2000) // half of 4000
  })

  it('lost ACK: the server applied it, the retry is a DUPLICATE and nothing is applied twice', async () => {
    const { store, server, clock, terminal, engine } = setup()
    await seed(store, task('t1'))
    await terminal.startTask('t1')
    server.dropAck = true

    expect((await engine.flush()).offline).toBe(true) // terminal believes it failed
    expect(server.applied).toHaveLength(1) // …but the server did apply it

    clock.advance(60_000)
    const s = await engine.flush()
    expect(s.duplicates).toBe(1)
    expect(server.applied).toHaveLength(1)
    expect(await engine.pendingCount()).toBe(0)
  })

  it('a crash mid-send (rows stuck in SENDING) is recovered and resent safely', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('t1'))
    const op = await terminal.startTask('t1')
    // Simulate: marked SENDING, app killed before the response was processed
    await store.transaction(['outbox'], async (tx) => {
      const e = (await tx.get<OutboxEntry>('outbox', op.opId))!
      await tx.put('outbox', op.opId, { ...e, status: 'SENDING' })
    })
    server.ledger.set(op.opId, { outcome: 'APPLIED' }) // it had actually reached the server

    const s = await engine.flush()
    expect(s.duplicates).toBe(1)
    expect(server.applied).toHaveLength(0)
  })

  it('keeps refused operations for review and does not retry them', async () => {
    const { store, server, terminal, engine, clock } = setup()
    await seed(store, task('t1'))
    await terminal.startTask('t1')
    server.rejectTypes.add('TASK_START')

    const s = await engine.flush()
    expect(s.rejected).toBe(1)
    expect(await engine.pendingCount()).toBe(0)
    const rejected = await terminal.rejected()
    expect(rejected).toHaveLength(1)
    expect(rejected[0].lastError?.code).toBe('UNPROCESSABLE_ENTITY')

    clock.advance(3_600_000)
    expect((await engine.flush()).sent).toBe(0)
  })

  it('does not run two flushes at once', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('t1'))
    await terminal.startTask('t1')
    await Promise.all([engine.flush(), engine.flush()])
    expect(server.applied).toHaveLength(1)
  })

  it('splits large queues into batches', async () => {
    const { store, server, terminal } = setup()
    const engine = new SyncEngine({ store, transport: server, deviceId: 'd', batchSize: 3, now: () => 0 })
    for (let i = 0; i < 7; i++) {
      await terminal.moveInventory({ inventoryItemId: `i${i}`, warehouseId: 'w1', toCellId: 'c1', type: 'TRANSFER', quantity: 1 })
    }
    await engine.flush()
    expect(server.calls.map((c) => c.length)).toEqual([3, 3, 1])
  })
})

describe('SyncEngine.pull + offline scan', () => {
  it('loads tasks and the catalogue; scanning then works with no network', async () => {
    const { server, terminal, engine } = setup()
    server.tasks = [task('t1'), task('t2', 'COMPLETED')]
    await engine.pull('w1')
    server.networkUp = false

    expect((await terminal.myTasks()).map((t) => t.id)).toEqual(['t1'])
    expect(await terminal.scan('4600000000011')).toMatchObject({ matchType: 'PRODUCT', product: { sku: 'SKU-1' } })
    expect(await terminal.scan('CELL-A011')).toMatchObject({ matchType: 'CELL', cell: { code: 'A-01-1' } })
    expect(await terminal.scan('nope')).toEqual({ matchType: 'UNKNOWN' })
  })

  it('does not overwrite a task that has an undelivered local action', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('t1', 'ASSIGNED'))
    await terminal.startTask('t1') // local: IN_PROGRESS, not yet delivered
    server.tasks = [task('t1', 'ASSIGNED')] // server still shows the old state
    await engine.pull()

    const [t] = await terminal.myTasks()
    expect(t.status).toBe('IN_PROGRESS')
  })

  it('a full snapshot drops tasks that are no longer assigned to this worker', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('old'))
    server.tasks = [task('new')]
    await engine.pull()
    expect((await terminal.myTasks()).map((t) => t.id)).toEqual(['new'])
  })

  it('sync() pushes first, then pulls; offline → pushes nothing and reports it', async () => {
    const { store, server, terminal, engine } = setup()
    await seed(store, task('t1'))
    await terminal.startTask('t1')
    server.tasks = [task('t1', 'IN_PROGRESS')] // what the server now reports
    const ok = await engine.sync()
    expect(ok.flush.applied).toBe(1)
    expect(ok.pulled).toBe(true)

    await terminal.completeTask('t1')
    server.networkUp = false
    const off = await engine.sync()
    expect(off).toMatchObject({ pulled: false, flush: { offline: true } })
  })
})
