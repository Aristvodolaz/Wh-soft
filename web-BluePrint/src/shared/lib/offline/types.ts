export type StoreName = 'tasks' | 'products' | 'cells' | 'outbox' | 'meta'

export type OperationType = 'INVENTORY_MOVE' | 'TASK_START' | 'TASK_COMPLETE' | 'TASK_FAIL'

/** A row of the transactional outbox. Written in the SAME local transaction as the state change. */
export interface OutboxEntry {
  /** Client-generated UUID — the idempotency key; never changes across retries. */
  opId: string
  /** Monotonic local sequence — defines the order in which the server applies operations. */
  seq: number
  type: OperationType
  payload: Record<string, unknown>
  /** When the user did it on the terminal (survives hours offline). */
  occurredAt: string
  status: 'PENDING' | 'SENDING' | 'REJECTED'
  attempts: number
  /** Earliest time (epoch ms) of the next delivery attempt. */
  nextAttemptAt: number
  lastError?: { code: string; message: string }
}

export interface LocalTask {
  id: string
  warehouseId: string
  type: string
  status: string
  priority: string
  title: string
  assignedTo: string | null
  fromCellId: string | null
  toCellId: string | null
  productId: string | null
  quantity: number | null
  notes: string | null
  dueAt: string | null
  updatedAt: string
}

export interface CatalogProduct {
  id: string
  sku: string
  name: string
  barcode: string | null
  isActive: boolean
}

export interface CatalogCell {
  id: string
  code: string
  barcode: string | null
  isActive: boolean
}

/** Operations available inside a store transaction. Every method is atomic with the others. */
export interface Tx {
  get<T>(store: StoreName, key: string): Promise<T | undefined>
  getAll<T>(store: StoreName): Promise<T[]>
  put(store: StoreName, key: string, value: unknown): Promise<void>
  delete(store: StoreName, key: string): Promise<void>
}

export interface OfflineStore {
  /**
   * Run `fn` atomically over `stores`: either every write inside it is persisted or none is.
   * `fn` must only await Tx methods (an IndexedDB transaction dies on foreign awaits).
   */
  transaction<T>(stores: StoreName[], fn: (tx: Tx) => Promise<T>): Promise<T>
}

// ── Wire format (mirrors the backend /sync API) ─────────────────────────────────

export type OperationOutcome = 'APPLIED' | 'DUPLICATE' | 'REJECTED' | 'IN_FLIGHT' | 'RETRY'

export interface OperationResult {
  opId: string
  outcome: OperationOutcome
  result?: unknown
  error?: { code: string; message: string }
}

export interface PushResponse {
  serverTime: string
  results: OperationResult[]
}

export interface PullResponse {
  cursor: string
  full: boolean
  tasks: LocalTask[]
  catalog: { products: CatalogProduct[]; cells: CatalogCell[] }
}

export interface SyncTransport {
  push(
    deviceId: string,
    operations: Array<Pick<OutboxEntry, 'opId' | 'type' | 'payload' | 'occurredAt'>>,
  ): Promise<PushResponse>
  pull(params: { since?: string; warehouseId?: string }): Promise<PullResponse>
}
