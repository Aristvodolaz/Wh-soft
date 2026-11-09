import { HttpException, Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Role } from '../../../../shared/types/role.enum';
import { MoveInventoryDto } from '../../../inventory/application/dto/move-inventory.dto';
import { InventoryService } from '../../../inventory/application/services/inventory.service';
import { CompleteTaskDto } from '../../../tasks/application/dto/complete-task.dto';
import { TasksService } from '../../../tasks/application/services/tasks.service';
import {
  OperationOutcome,
  OperationResultDto,
  PullQueryDto,
  PushDto,
  PushResponseDto,
  SyncOperationDto,
  SyncOperationType,
} from '../dto/sync.dto';

/** Client clocks drift; accept `occurredAt` only inside this window. */
const MAX_BACKDATE_MS = 7 * 24 * 3_600_000;
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly inventory: InventoryService,
    private readonly tasks: TasksService,
  ) {}

  // ── Push ──────────────────────────────────────────────────────────────────────

  /**
   * Idempotent batch apply.
   *  1. INSERT the ledger row `(tenant, op_id)` with ON CONFLICT DO NOTHING — the unique key
   *     arbitrates concurrent/retried deliveries; only the winner executes the operation.
   *  2. Execute; store the outcome in the ledger.
   *  3. A repeated op_id returns the STORED outcome and never re-runs the operation.
   */
  async push(user: JwtPayload, dto: PushDto): Promise<PushResponseDto> {
    const results: OperationResultDto[] = [];
    let halted = false;
    for (const op of dto.operations) {
      if (halted) {
        // Order matters (START → COMPLETE): after a transient failure nothing later may run,
        // otherwise a dependent op would be refused for the wrong reason and lost.
        results.push({
          opId: op.opId,
          outcome: 'RETRY',
          error: { code: 'SKIPPED_ORDER', message: 'An earlier operation must be retried first' },
        });
        continue;
      }
      const r = await this.processOne(user, dto.deviceId, op);
      results.push(r);
      if (r.outcome === 'RETRY' || r.outcome === 'IN_FLIGHT') halted = true;
    }
    return { serverTime: new Date().toISOString(), results };
  }

  private async processOne(user: JwtPayload, deviceId: string, op: SyncOperationDto): Promise<OperationResultDto> {
    const claimed: Array<{ id: string }> = await this.dataSource.query(
      `INSERT INTO sync_operations (tenant_id, op_id, device_id, user_id, type, status, client_created_at)
       VALUES ($1, $2, $3, $4, $5, 'PROCESSING', $6)
       ON CONFLICT (tenant_id, op_id) DO NOTHING
       RETURNING id`,
      [user.tenantId, op.opId, deviceId, user.sub, op.type, op.occurredAt],
    );

    if (!claimed.length) return this.replay(user, op.opId);

    try {
      const result = await this.execute(user, op);
      await this.finish(user.tenantId, op.opId, 'APPLIED', { result });
      return { opId: op.opId, outcome: 'APPLIED', result };
    } catch (err) {
      if (err instanceof HttpException) {
        const body = err.getResponse() as { code?: string; message?: string | string[] };
        const error = {
          code: body.code ?? `HTTP_${err.getStatus()}`,
          message: Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? err.message),
        };
        await this.finish(user.tenantId, op.opId, 'REJECTED', { error });
        return { opId: op.opId, outcome: 'REJECTED', error };
      }
      // Unknown/transient failure: free the key so the terminal can retry the same op_id.
      this.logger.error(`sync op ${op.opId} (${op.type}) failed: ${(err as Error).message}`);
      await this.dataSource.query(`DELETE FROM sync_operations WHERE tenant_id = $1 AND op_id = $2`, [
        user.tenantId,
        op.opId,
      ]);
      return { opId: op.opId, outcome: 'RETRY', error: { code: 'TRANSIENT', message: 'Temporary server error' } };
    }
  }

  private async replay(user: JwtPayload, opId: string): Promise<OperationResultDto> {
    const [row]: Array<{ status: string; response: Record<string, unknown> | null; user_id: string }> =
      await this.dataSource.query(
        `SELECT status, response, user_id FROM sync_operations WHERE tenant_id = $1 AND op_id = $2`,
        [user.tenantId, opId],
      );
    if (!row) return { opId, outcome: 'RETRY', error: { code: 'TRANSIENT', message: 'Retry' } };
    if (row.user_id !== user.sub) {
      return { opId, outcome: 'REJECTED', error: { code: 'CONFLICT', message: 'Operation id belongs to another user' } };
    }
    if (row.status === 'PROCESSING') return { opId, outcome: 'IN_FLIGHT' };
    // A stored refusal stays a refusal; a stored success is reported as DUPLICATE.
    const outcome: OperationOutcome = row.status === 'REJECTED' ? 'REJECTED' : 'DUPLICATE';
    return { opId, outcome, ...(row.response ?? {}) } as OperationResultDto;
  }

  private finish(tenantId: string, opId: string, status: 'APPLIED' | 'REJECTED', response: object): Promise<unknown> {
    return this.dataSource.query(
      `UPDATE sync_operations SET status = $3, response = $4::jsonb WHERE tenant_id = $1 AND op_id = $2`,
      [tenantId, opId, status, JSON.stringify(response)],
    );
  }

  // ── Operations ────────────────────────────────────────────────────────────────

  private async execute(user: JwtPayload, op: SyncOperationDto): Promise<unknown> {
    switch (op.type) {
      case SyncOperationType.INVENTORY_MOVE: {
        const dto = await this.parse(MoveInventoryDto, op.payload);
        return this.inventory.move(user.tenantId, user.sub, dto);
      }
      case SyncOperationType.TASK_START: {
        const taskId = await this.ownTask(user, op.payload);
        const res = await this.tasks.startTask(user.tenantId, taskId, user.sub);
        await this.backdate(user.tenantId, taskId, 'started_at', op.occurredAt);
        return res;
      }
      case SyncOperationType.TASK_COMPLETE: {
        const taskId = await this.ownTask(user, op.payload);
        const dto = await this.parse(CompleteTaskDto, op.payload);
        const res = await this.tasks.completeTask(user.tenantId, taskId, user.sub, dto);
        await this.backdate(user.tenantId, taskId, 'completed_at', op.occurredAt);
        return res;
      }
      case SyncOperationType.TASK_FAIL: {
        const taskId = await this.ownTask(user, op.payload);
        const dto = await this.parse(CompleteTaskDto, op.payload);
        return this.tasks.failTask(user.tenantId, taskId, user.sub, dto);
      }
      default:
        throw AppException.unprocessable(`Unsupported operation type "${String(op.type)}"`);
    }
  }

  private async parse<T extends object>(cls: new () => T, payload: Record<string, unknown>): Promise<T> {
    const inst = plainToInstance(cls, payload);
    const errors = await validate(inst, { whitelist: true, forbidUnknownValues: false });
    if (errors.length) {
      throw AppException.unprocessable(
        errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ') || 'Invalid payload',
      );
    }
    return inst;
  }

  /** Workers may only act on their own tasks; managers/admins on any. */
  private async ownTask(user: JwtPayload, payload: Record<string, unknown>): Promise<string> {
    const taskId = payload.taskId;
    if (typeof taskId !== 'string' || !/^[0-9a-f-]{36}$/i.test(taskId)) {
      throw AppException.unprocessable('payload.taskId must be a UUID');
    }
    if (user.role === Role.WORKER) {
      const task = await this.tasks.getTask(user.tenantId, taskId);
      if (task.assignedTo !== user.sub) throw AppException.forbidden('Task is assigned to another user');
    }
    return taskId;
  }

  /**
   * The terminal may have worked offline for hours: keep the REAL start/finish time so
   * KPI and norm calibration are not polluted by sync latency. Ignored when implausible.
   */
  private async backdate(
    tenantId: string,
    taskId: string,
    column: 'started_at' | 'completed_at',
    occurredAt: string,
  ): Promise<void> {
    const t = Date.parse(occurredAt);
    const now = Date.now();
    if (Number.isNaN(t) || t > now + MAX_FUTURE_SKEW_MS || t < now - MAX_BACKDATE_MS) return;
    const at = new Date(Math.min(t, now)).toISOString();
    const guard = column === 'completed_at' ? 'AND $3::timestamptz >= COALESCE(started_at, assigned_at, $3::timestamptz)' : '';
    await this.dataSource.query(
      `UPDATE tasks SET ${column} = $3::timestamptz WHERE id = $1 AND tenant_id = $2 ${guard}`,
      [taskId, tenantId, at],
    );
  }

  // ── Pull ──────────────────────────────────────────────────────────────────────

  /**
   * Delta download for the terminal's local database.
   *  - tasks assigned to the caller (every status after the first sync, so completions /
   *    cancellations reach the device);
   *  - the scan catalogue (products, cells) for offline barcode resolution.
   * The returned cursor is taken BEFORE reading, so a concurrent write can only be
   * delivered twice (harmless — the client upserts), never missed.
   */
  async pull(user: JwtPayload, q: PullQueryDto): Promise<Record<string, unknown>> {
    const [{ now }] = await this.dataSource.query(`SELECT NOW() AS now`);
    const since = q.since ?? null;

    const tasks = await this.dataSource.query(
      `
      SELECT id, warehouse_id AS "warehouseId", order_id AS "orderId", type, status, priority, title,
             description, assigned_to AS "assignedTo", due_at AS "dueAt",
             from_cell_id AS "fromCellId", to_cell_id AS "toCellId",
             product_id AS "productId", quantity, notes, updated_at AS "updatedAt"
      FROM tasks
      WHERE tenant_id = $1 AND assigned_to = $2
        AND ( ($3::timestamptz IS NULL AND status IN ('ASSIGNED','IN_PROGRESS'))
              OR ($3::timestamptz IS NOT NULL AND updated_at > $3::timestamptz) )
      ORDER BY updated_at
      `,
      [user.tenantId, user.sub, since],
    );

    const products = await this.dataSource.query(
      `SELECT id, sku, name, barcode, unit, is_active AS "isActive", updated_at AS "updatedAt"
       FROM products
       WHERE tenant_id = $1 AND ($2::timestamptz IS NULL OR updated_at > $2::timestamptz)`,
      [user.tenantId, since],
    );

    const cells = q.warehouseId
      ? await this.dataSource.query(
          `SELECT id, code, barcode, zone_id AS "zoneId", is_active AS "isActive", updated_at AS "updatedAt"
           FROM cells
           WHERE tenant_id = $1 AND warehouse_id = $2 AND ($3::timestamptz IS NULL OR updated_at > $3::timestamptz)`,
          [user.tenantId, q.warehouseId, since],
        )
      : [];

    return {
      cursor: new Date(now).toISOString(),
      full: since === null,
      tasks,
      catalog: { products, cells },
    };
  }
}
