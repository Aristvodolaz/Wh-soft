import { AppException } from '../../../../../shared/exceptions/app.exception';
import { JwtPayload } from '../../../../../shared/decorators/current-user.decorator';
import { PushDto, SyncOperationType } from '../../dto/sync.dto';
import { SyncService } from '../sync.service';

/** Minimal in-memory stand-in for the sync_operations ledger (unique on tenant + op_id). */
class FakeDataSource {
  ledger = new Map<string, { status: string; response: unknown; user_id: string }>();
  taskUpdates: unknown[][] = [];

  query = jest.fn(async (sql: string, params: unknown[] = []) => {
    const key = `${params[0]}:${params[1]}`;
    if (sql.includes('INSERT INTO sync_operations')) {
      if (this.ledger.has(key)) return [];
      this.ledger.set(key, { status: 'PROCESSING', response: null, user_id: String(params[3]) });
      return [{ id: 'row' }];
    }
    if (sql.includes('SELECT status, response, user_id')) {
      const r = this.ledger.get(key);
      return r ? [r] : [];
    }
    if (sql.includes('UPDATE sync_operations')) {
      const r = this.ledger.get(key)!;
      r.status = String(params[2]);
      r.response = JSON.parse(String(params[3]));
      return [];
    }
    if (sql.includes('DELETE FROM sync_operations')) {
      this.ledger.delete(key);
      return [];
    }
    if (sql.trimStart().startsWith('UPDATE tasks')) {
      this.taskUpdates.push(params);
      return [];
    }
    return [];
  });
}

const user: JwtPayload = { sub: 'u1', email: 'w@x', tenantId: 't1', role: 'WORKER' };
const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function setup() {
  const ds = new FakeDataSource();
  const inventory = { move: jest.fn().mockResolvedValue({ id: 'mov-1' }) };
  const tasks = {
    getTask: jest.fn().mockResolvedValue({ assignedTo: 'u1' }),
    startTask: jest.fn().mockResolvedValue({ id: 'task', status: 'IN_PROGRESS' }),
    completeTask: jest.fn().mockResolvedValue({ id: 'task', status: 'COMPLETED' }),
    failTask: jest.fn(),
  };
  const svc = new SyncService(ds as never, inventory as never, tasks as never);
  return { ds, inventory, tasks, svc };
}

const move = (opId: string) => ({
  opId,
  type: SyncOperationType.INVENTORY_MOVE,
  occurredAt: new Date().toISOString(),
  payload: {
    inventoryItemId: UUID(1),
    warehouseId: UUID(2),
    toCellId: UUID(3),
    type: 'TRANSFER',
    quantity: 5,
  },
});

describe('SyncService.push — idempotency', () => {
  it('applies an operation once and returns the stored result for a retry', async () => {
    const { svc, inventory } = setup();
    const dto: PushDto = { deviceId: 'tsd-1', operations: [move(UUID(10))] };

    const first = await svc.push(user, dto);
    expect(first.results[0].outcome).toBe('APPLIED');

    const second = await svc.push(user, dto); // the ACK was lost → terminal re-sends
    expect(second.results[0].outcome).toBe('DUPLICATE');
    expect(second.results[0].result).toEqual({ id: 'mov-1' });
    expect(inventory.move).toHaveBeenCalledTimes(1);
  });

  it('is safe when the same batch races with itself', async () => {
    const { svc, inventory } = setup();
    const dto: PushDto = { deviceId: 'tsd-1', operations: [move(UUID(11))] };
    const [a, b] = await Promise.all([svc.push(user, dto), svc.push(user, dto)]);
    expect(inventory.move).toHaveBeenCalledTimes(1);
    const outcomes = [a.results[0].outcome, b.results[0].outcome].sort();
    expect(outcomes[0]).toBe('APPLIED');
    expect(['DUPLICATE', 'IN_FLIGHT']).toContain(outcomes[1]);
  });

  it('remembers business rejections and does not re-run them', async () => {
    const { svc, inventory } = setup();
    inventory.move.mockRejectedValueOnce(AppException.unprocessable('Insufficient available stock'));
    const dto: PushDto = { deviceId: 'tsd-1', operations: [move(UUID(12))] };

    const first = await svc.push(user, dto);
    expect(first.results[0]).toMatchObject({ outcome: 'REJECTED', error: { code: 'UNPROCESSABLE_ENTITY' } });

    const second = await svc.push(user, dto);
    expect(second.results[0].outcome).toBe('REJECTED');
    expect(inventory.move).toHaveBeenCalledTimes(1);
  });

  it('releases the key on a transient failure so the retry really executes', async () => {
    const { svc, inventory } = setup();
    inventory.move.mockRejectedValueOnce(new Error('connection reset'));
    const dto: PushDto = { deviceId: 'tsd-1', operations: [move(UUID(13))] };

    expect((await svc.push(user, dto)).results[0].outcome).toBe('RETRY');
    expect((await svc.push(user, dto)).results[0].outcome).toBe('APPLIED');
    expect(inventory.move).toHaveBeenCalledTimes(2);
  });

  it('processes a batch in order and reports each result independently', async () => {
    const { svc, inventory } = setup();
    inventory.move.mockRejectedValueOnce(AppException.unprocessable('nope'));
    const res = await svc.push(user, { deviceId: 'tsd-1', operations: [move(UUID(20)), move(UUID(21))] });
    expect(res.results.map((r) => r.outcome)).toEqual(['REJECTED', 'APPLIED']);
  });

  it('stops the batch at a transient failure so dependent operations keep their order', async () => {
    const { svc, tasks } = setup();
    tasks.startTask.mockRejectedValueOnce(new Error('db down'));
    const at = new Date().toISOString();
    const res = await svc.push(user, {
      deviceId: 'd',
      operations: [
        { opId: UUID(70), type: SyncOperationType.TASK_START, occurredAt: at, payload: { taskId: UUID(90) } },
        { opId: UUID(71), type: SyncOperationType.TASK_COMPLETE, occurredAt: at, payload: { taskId: UUID(90) } },
      ],
    });
    expect(res.results.map((r) => r.outcome)).toEqual(['RETRY', 'RETRY']);
    expect(tasks.completeTask).not.toHaveBeenCalled(); // never reached → will be retried in order
  });

  it('rejects invalid payloads without touching the domain', async () => {
    const { svc, inventory } = setup();
    const bad = { ...move(UUID(30)), payload: { quantity: -1 } };
    const res = await svc.push(user, { deviceId: 'd', operations: [bad] });
    expect(res.results[0].outcome).toBe('REJECTED');
    expect(inventory.move).not.toHaveBeenCalled();
  });

  it('a worker cannot act on someone else’s task', async () => {
    const { svc, tasks } = setup();
    tasks.getTask.mockResolvedValue({ assignedTo: 'someone-else' });
    const res = await svc.push(user, {
      deviceId: 'd',
      operations: [
        { opId: UUID(40), type: SyncOperationType.TASK_START, occurredAt: new Date().toISOString(), payload: { taskId: UUID(99) } },
      ],
    });
    expect(res.results[0]).toMatchObject({ outcome: 'REJECTED', error: { code: 'FORBIDDEN' } });
    expect(tasks.startTask).not.toHaveBeenCalled();
  });

  it('keeps the real offline completion time and ignores implausible ones', async () => {
    const { svc, ds } = setup();
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString();

    await svc.push(user, {
      deviceId: 'd',
      operations: [
        { opId: UUID(50), type: SyncOperationType.TASK_COMPLETE, occurredAt: hourAgo, payload: { taskId: UUID(98) } },
        { opId: UUID(51), type: SyncOperationType.TASK_COMPLETE, occurredAt: nextYear, payload: { taskId: UUID(97) } },
      ],
    });
    expect(ds.taskUpdates).toHaveLength(1);
    expect(ds.taskUpdates[0][2]).toBe(hourAgo);
  });

  it('refuses an op id that already belongs to another user', async () => {
    const { svc } = setup();
    const dto: PushDto = { deviceId: 'd', operations: [move(UUID(60))] };
    await svc.push(user, dto);
    const other = await svc.push({ ...user, sub: 'u2' }, dto);
    expect(other.results[0]).toMatchObject({ outcome: 'REJECTED', error: { code: 'CONFLICT' } });
  });
});
