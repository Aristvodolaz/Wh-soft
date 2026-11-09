import type { OfflineStore, StoreName, Tx } from './types'

const STORES: StoreName[] = ['tasks', 'products', 'cells', 'outbox', 'meta']

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

/**
 * Persistent store on IndexedDB (browser terminals / PWA). A transaction maps 1:1 onto a native
 * IDB transaction, so the outbox row and the business state are committed atomically even if
 * the battery dies in the middle.
 */
export class IndexedDbStore implements OfflineStore {
  private dbPromise: Promise<IDBDatabase> | null = null

  constructor(private readonly name = 'wms-terminal') {}

  private open(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const r = indexedDB.open(this.name, 1)
      r.onupgradeneeded = () => {
        for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s)
      }
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
    })
    return this.dbPromise
  }

  async transaction<T>(stores: StoreName[], fn: (tx: Tx) => Promise<T>): Promise<T> {
    const db = await this.open()
    const native = db.transaction(stores, 'readwrite')
    const done = new Promise<void>((resolve, reject) => {
      native.oncomplete = () => resolve()
      native.onerror = () => reject(native.error)
      native.onabort = () => reject(native.error ?? new Error('Transaction aborted'))
    })

    const tx: Tx = {
      get: async <V>(s: StoreName, k: string) => (await req(native.objectStore(s).get(k))) as V | undefined,
      getAll: async <V>(s: StoreName) => (await req(native.objectStore(s).getAll())) as V[],
      put: async (s, k, v) => {
        await req(native.objectStore(s).put(v, k))
      },
      delete: async (s, k) => {
        await req(native.objectStore(s).delete(k))
      },
    }

    try {
      const result = await fn(tx)
      await done
      return result
    } catch (e) {
      try {
        native.abort() // rolls back every write made inside fn
      } catch {
        /* already finished */
      }
      await done.catch(() => undefined)
      throw e
    }
  }
}
