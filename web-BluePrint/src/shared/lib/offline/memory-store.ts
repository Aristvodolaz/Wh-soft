import type { OfflineStore, StoreName, Tx } from './types'

// Stored values are plain JSON — a JSON round-trip is a portable deep copy.
const clone = <V>(v: V): V => JSON.parse(JSON.stringify(v)) as V

/**
 * In-memory store with real transactional semantics (copy-on-write + commit, serialised
 * writers). Used in tests and as a fallback where IndexedDB is unavailable.
 */
export class MemoryStore implements OfflineStore {
  private data = new Map<StoreName, Map<string, unknown>>()
  private queue: Promise<unknown> = Promise.resolve()

  private bucket(name: StoreName, from = this.data): Map<string, unknown> {
    let b = from.get(name)
    if (!b) {
      b = new Map()
      from.set(name, b)
    }
    return b
  }

  transaction<T>(stores: StoreName[], fn: (tx: Tx) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
      // Work on a private copy of the touched stores; publish it only on success.
      const draft = new Map<StoreName, Map<string, unknown>>()
      for (const s of stores) draft.set(s, new Map(clone([...this.bucket(s)])))

      const need = (s: StoreName): Map<string, unknown> => {
        const b = draft.get(s)
        if (!b) throw new Error(`Store "${s}" is not part of this transaction`)
        return b
      }
      const tx: Tx = {
        get: async <V>(s: StoreName, k: string) => {
          const v = need(s).get(k)
          return (v === undefined ? undefined : clone(v)) as V | undefined
        },
        getAll: async <V>(s: StoreName) => [...need(s).values()].map((v) => clone(v)) as V[],
        put: async (s, k, v) => {
          need(s).set(k, clone(v))
        },
        delete: async (s, k) => {
          need(s).delete(k)
        },
      }

      const result = await fn(tx)
      for (const [name, b] of draft) this.data.set(name, b)
      return result
    }
    const next = this.queue.then(run, run)
    this.queue = next.catch(() => undefined)
    return next
  }
}
