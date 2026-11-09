import type {
  CatalogCell,
  CatalogProduct,
  LocalTask,
  OfflineStore,
  OperationType,
  OutboxEntry,
  Tx,
} from './types'

export interface TerminalOptions {
  store: OfflineStore
  newId?: () => string
  now?: () => Date
}

export type ScanResult =
  | { matchType: 'PRODUCT'; product: CatalogProduct }
  | { matchType: 'CELL'; cell: CatalogCell }
  | { matchType: 'UNKNOWN' }

/**
 * Local-first façade used by the terminal UI. Every business action does TWO things in ONE
 * local transaction — change the local state and append to the outbox (Transactional Outbox).
 * There is therefore no window in which an action is visible locally but never sent, or vice versa.
 */
export class OfflineTerminal {
  private readonly store: OfflineStore
  private readonly newId: () => string
  private readonly now: () => Date

  constructor(o: TerminalOptions) {
    this.store = o.store
    this.newId = o.newId ?? (() => crypto.randomUUID())
    this.now = o.now ?? (() => new Date())
  }

  private async enqueue(
    tx: Tx,
    type: OperationType,
    payload: Record<string, unknown>,
  ): Promise<OutboxEntry> {
    const seq = ((await tx.get<number>('meta', 'seq')) ?? 0) + 1
    await tx.put('meta', 'seq', seq)
    const entry: OutboxEntry = {
      opId: this.newId(),
      seq,
      type,
      payload,
      occurredAt: this.now().toISOString(),
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: 0,
    }
    await tx.put('outbox', entry.opId, entry)
    return entry
  }

  // ── Reads (never touch the network) ────────────────────────────────────────────

  async myTasks(): Promise<LocalTask[]> {
    const all = await this.store.transaction(['tasks'], (tx) => tx.getAll<LocalTask>('tasks'))
    const rank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 }
    return all
      .filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
      .sort(
        (a, b) =>
          (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) ||
          (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'),
      )
  }

  /** Barcode resolution against the local catalogue — works in a dead zone. */
  async scan(barcode: string): Promise<ScanResult> {
    return this.store.transaction(['products', 'cells'], async (tx) => {
      const product = (await tx.getAll<CatalogProduct>('products')).find((p) => p.barcode === barcode)
      if (product) return { matchType: 'PRODUCT', product } as const
      const cell = (await tx.getAll<CatalogCell>('cells')).find((c) => c.barcode === barcode)
      if (cell) return { matchType: 'CELL', cell } as const
      return { matchType: 'UNKNOWN' } as const
    })
  }

  // ── Commands (local state change + outbox row, atomically) ─────────────────────

  startTask(taskId: string): Promise<OutboxEntry> {
    return this.transition(taskId, 'ASSIGNED', 'IN_PROGRESS', 'TASK_START', {})
  }

  completeTask(taskId: string, notes?: string): Promise<OutboxEntry> {
    return this.transition(taskId, 'IN_PROGRESS', 'COMPLETED', 'TASK_COMPLETE', notes ? { notes } : {})
  }

  failTask(taskId: string, notes?: string): Promise<OutboxEntry> {
    return this.transition(taskId, 'IN_PROGRESS', 'FAILED', 'TASK_FAIL', notes ? { notes } : {})
  }

  private transition(
    taskId: string,
    from: string,
    to: string,
    type: OperationType,
    extra: Record<string, unknown>,
  ): Promise<OutboxEntry> {
    return this.store.transaction(['tasks', 'outbox', 'meta'], async (tx) => {
      const task = await tx.get<LocalTask>('tasks', taskId)
      if (!task) throw new Error(`Task ${taskId} is not on this terminal`)
      if (task.status !== from) throw new Error(`Task must be ${from} (is ${task.status})`)
      await tx.put('tasks', taskId, { ...task, status: to })
      return this.enqueue(tx, type, { taskId, ...extra })
    })
  }

  moveInventory(args: {
    inventoryItemId: string
    warehouseId: string
    fromCellId?: string
    toCellId?: string
    type: 'INBOUND' | 'OUTBOUND' | 'TRANSFER' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED'
    quantity: number
    reference?: string
    notes?: string
  }): Promise<OutboxEntry> {
    if (!Number.isInteger(args.quantity) || args.quantity < 1) throw new Error('quantity must be a positive integer')
    return this.store.transaction(['outbox', 'meta'], (tx) => this.enqueue(tx, 'INVENTORY_MOVE', { ...args }))
  }

  /** Rows the server refused — shown to the supervisor, never retried automatically. */
  async rejected(): Promise<OutboxEntry[]> {
    const all = await this.store.transaction(['outbox'], (tx) => tx.getAll<OutboxEntry>('outbox'))
    return all.filter((e) => e.status === 'REJECTED').sort((a, b) => a.seq - b.seq)
  }
}
