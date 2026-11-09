# Автономный контур терминала (Transactional Outbox + идемпотентный sync)

Эталонная реализация клиента — `web-BluePrint/src/shared/lib/offline/` (тесты: `__tests__/offline.test.ts`).
Android-клиент (Room + WorkManager) должен повторять тот же контракт.

## Правила
1. **Одна локальная транзакция = изменение состояния + строка outbox.** Room: `@Transaction`, обе записи в одном `withTransaction {}`.
2. **`opId` — UUID v4, создаётся один раз** при записи в outbox и не меняется при ретраях. Это ключ идемпотентности на сервере (`UNIQUE(tenant_id, op_id)`).
3. Порядок строго по `seq` (монотонный счётчик). Сервер применяет пакет по порядку и при временном сбое останавливается (остаток → `RETRY`, `SKIPPED_ORDER`).
4. Перед сетевым вызовом строки помечаются `SENDING` (персистентно). После падения приложения `SENDING → PENDING` и отправка повторяется — безопасно, т.к. `opId` тот же.
5. Backoff: `d = min(5 мин, 2 с · 2^attempts)`, задержка ∈ [d/2, d]. WorkManager: `ExistingWorkPolicy.KEEP`, constraint `NETWORK_CONNECTED`, один воркер одновременно.
6. Исходы сервера: `APPLIED`/`DUPLICATE` → удалить строку; `REJECTED` → оставить как `REJECTED` для супервайзера (не ретраить); `RETRY`/`IN_FLIGHT` → backoff.
7. `occurredAt` — реальное время действия на терминале; сервер сохраняет его как `started_at`/`completed_at` (окно: 7 суток назад … +5 мин), чтобы KPI не искажались задержкой синхронизации.
8. Pull: курсор `since` хранится в `meta`; задачи с локальными неотправленными операциями не перезаписываются.

## Room
```kotlin
@Entity(tableName = "outbox", indices = [Index("status", "nextAttemptAt")])
data class OutboxEntry(
  @PrimaryKey val opId: String,
  val seq: Long,                 // AUTOINCREMENT-подобный счётчик из таблицы meta
  val type: String,              // INVENTORY_MOVE | TASK_START | TASK_COMPLETE | TASK_FAIL
  val payloadJson: String,
  val occurredAt: String,        // ISO-8601
  val status: String,            // PENDING | SENDING | REJECTED
  val attempts: Int,
  val nextAttemptAt: Long,
  val lastErrorCode: String?, val lastErrorMessage: String?,
)

@Dao interface TaskDao {
  @Transaction suspend fun complete(taskId: String, notes: String?) {
    markCompleted(taskId)                       // локальное состояние
    outbox.insert(OutboxEntry(opId = uuid(), seq = nextSeq(), type = "TASK_COMPLETE", ...))
  }
}
```

## API
- `POST /sync/push` `{ deviceId, operations: [{ opId, type, payload, occurredAt }] }` → `{ serverTime, results: [{ opId, outcome, result?, error? }] }`
- `GET /sync/pull?since=<cursor>&warehouseId=<id>` → `{ cursor, full, tasks, catalog: { products, cells } }`
