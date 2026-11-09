import type {
  CatalogCell,
  CatalogProduct,
  LocalTask,
  OfflineStore,
  OutboxEntry,
  PullResponse,
  SyncTransport,
} from './types'

export interface SyncEngineOptions {
  store: OfflineStore
  transport: SyncTransport
  deviceId: string
  /** Operations per request. */
  batchSize?: number
  baseDelayMs?: number
  maxDelayMs?: number
  now?: () => number
  /** 0..1 — injectable for deterministic tests. */
  random?: () => number
}

export interface FlushSummary {
  sent: number
  applied: number
  duplicates: number
  rejected: number
  retried: number
  /** True when the network call itself failed (terminal is in a dead zone). */
  offline: boolean
}

const ACTIVE_TASK = new Set(['ASSIGNED', 'IN_PROGRESS'])

/**
 * Outbox → server delivery with at-least-once semantics made effectively-once by the
 * server's idempotency ledger (the opId never changes between attempts).
 */
export class SyncEngine {
  private readonly store: OfflineStore
  private readonly transport: SyncTransport
  private readonly deviceId: string
  private readonly batchSize: number
  private readonly baseDelay: number
  private readonly maxDelay: number
  private readonly now: () => number
  private readonly random: () => number
  private running: Promise<unknown> | null = null

  constructor(o: SyncEngineOptions) {
    this.store = o.store
    this.transport = o.transport
    this.deviceId = o.deviceId
    this.batchSize = o.batchSize ?? 50
    this.baseDelay = o.baseDelayMs ?? 2_000
    this.maxDelay = o.maxDelayMs ?? 5 * 60_000
    this.now = o.now ?? Date.now
    this.random = o.random ?? Math.random
  }

  /** Exponential backoff with full jitter: delay ∈ [½·d, d], d = min(max, base·2^attempts). */
  backoff(attempts: number): number {
    const d = Math.min(this.maxDelay, this.baseDelay * 2 ** attempts)
    return Math.round(d / 2 + (d / 2) * this.random())
  }

  /** Never run two syncs at once (they would double-send the same rows). */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const p = (this.running ?? Promise.resolve()).then(fn, fn)
    this.running = p.catch(() => undefined)
    return p
  }

  /** Crash recovery: anything left in SENDING after a restart was possibly delivered — resend it (safe: same opId). */
  async recover(): Promise<number> {
    return this.store.transaction(['outbox'], async (tx) => {
      const rows = await tx.getAll<OutboxEntry>('outbox')
      let n = 0
      for (const r of rows.filter((x) => x.status === 'SENDING')) {
        await tx.put('outbox', r.opId, { ...r, status: 'PENDING', nextAttemptAt: 0 })
        n++
      }
      return n
    })
  }

  flush(): Promise<FlushSummary> {
    return this.exclusive(() => this.doFlush())
  }

  private async doFlush(): Promise<FlushSummary> {
    const summary: FlushSummary = { sent: 0, applied: 0, duplicates: 0, rejected: 0, retried: 0, offline: false }
    await this.recover()

    for (;;) {
      // 1. Claim a batch (PENDING → SENDING) — persisted BEFORE the network call.
      const batch = await this.store.transaction(['outbox'], async (tx) => {
        const due = (await tx.getAll<OutboxEntry>('outbox'))
          .filter((e) => e.status === 'PENDING' && e.nextAttemptAt <= this.now())
          .sort((a, b) => a.seq - b.seq)
          .slice(0, this.batchSize)
        for (const e of due) await tx.put('outbox', e.opId, { ...e, status: 'SENDING' })
        return due
      })
      if (!batch.length) return summary

      summary.sent += batch.length
      let response
      try {
        response = await this.transport.push(
          this.deviceId,
          batch.map(({ opId, type, payload, occurredAt }) => ({ opId, type, payload, occurredAt })),
        )
      } catch {
        // Dead zone / timeout: the server may or may not have applied it — keep the same opIds.
        await this.release(batch, 'network')
        summary.offline = true
        summary.retried += batch.length
        return summary
      }

      // 2. Apply per-operation results atomically.
      const byId = new Map(response.results.map((r) => [r.opId, r]))
      const retry: OutboxEntry[] = []
      await this.store.transaction(['outbox'], async (tx) => {
        for (const e of batch) {
          const r = byId.get(e.opId)
          if (r?.outcome === 'APPLIED' || r?.outcome === 'DUPLICATE') {
            await tx.delete('outbox', e.opId)
            if (r.outcome === 'APPLIED') summary.applied++
            else summary.duplicates++
          } else if (r?.outcome === 'REJECTED') {
            // Terminal business refusal — kept for operator review, never retried automatically.
            await tx.put('outbox', e.opId, { ...e, status: 'REJECTED', lastError: r.error })
            summary.rejected++
          } else {
            retry.push(e) // RETRY / IN_FLIGHT / missing
          }
        }
      })
      if (retry.length) {
        await this.release(retry, 'server')
        summary.retried += retry.length
        return summary // the server asked us to wait; later ops must not overtake
      }
    }
  }

  private release(entries: OutboxEntry[], _why: 'network' | 'server'): Promise<void> {
    return this.store.transaction(['outbox'], async (tx) => {
      for (const e of entries) {
        const attempts = e.attempts + 1
        await tx.put('outbox', e.opId, {
          ...e,
          status: 'PENDING',
          attempts,
          nextAttemptAt: this.now() + this.backoff(attempts),
        })
      }
    })
  }

  /** Download my tasks + scan catalogue; local-pending changes are never overwritten. */
  pull(warehouseId?: string): Promise<PullResponse> {
    return this.exclusive(async () => {
      const since = await this.store.transaction(['meta'], (tx) => tx.get<string>('meta', 'cursor'))
      const res = await this.transport.pull({ since, warehouseId })

      await this.store.transaction(['tasks', 'products', 'cells', 'outbox', 'meta'], async (tx) => {
        const outbox = await tx.getAll<OutboxEntry>('outbox')
        const touched = new Set(
          outbox.map((o) => (o.payload.taskId as string | undefined) ?? '').filter(Boolean),
        )

        for (const t of res.tasks) {
          if (touched.has(t.id)) continue // local intent wins until it is delivered
          // Finished / cancelled tasks leave the device; active ones are upserted.
          if (ACTIVE_TASK.has(t.status)) await tx.put('tasks', t.id, t)
          else await tx.delete('tasks', t.id)
        }
        if (res.full) {
          // Snapshot: drop local tasks the server no longer lists as active (unless pending locally)
          const keep = new Set(res.tasks.map((t) => t.id))
          for (const t of await tx.getAll<LocalTask>('tasks')) {
            if (!keep.has(t.id) && !touched.has(t.id)) await tx.delete('tasks', t.id)
          }
        }
        for (const p of res.catalog.products as CatalogProduct[]) await tx.put('products', p.id, p)
        for (const c of res.catalog.cells as CatalogCell[]) await tx.put('cells', c.id, c)
        await tx.put('meta', 'cursor', res.cursor)
      })
      return res
    })
  }

  /** Push first (so the server sees our work), then refresh. */
  async sync(warehouseId?: string): Promise<{ flush: FlushSummary; pulled: boolean }> {
    const flush = await this.flush()
    if (flush.offline) return { flush, pulled: false }
    try {
      await this.pull(warehouseId)
      return { flush, pulled: true }
    } catch {
      return { flush: { ...flush, offline: true }, pulled: false }
    }
  }

  async pendingCount(): Promise<number> {
    return this.store.transaction(['outbox'], async (tx) =>
      (await tx.getAll<OutboxEntry>('outbox')).filter((e) => e.status !== 'REJECTED').length,
    )
  }
}
