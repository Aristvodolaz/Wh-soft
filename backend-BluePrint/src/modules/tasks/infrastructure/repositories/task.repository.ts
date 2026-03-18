import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../domain/entities/task.entity';

export interface TaskFilters {
  warehouseId?: string;
  type?: TaskType;
  status?: TaskStatus;
  assignedTo?: string;
}

@Injectable()
export class TaskRepository {
  constructor(
    @InjectRepository(Task)
    private readonly repo: Repository<Task>,
  ) {}

  findAllByTenant(tenantId: string, filters: TaskFilters = {}): Promise<Task[]> {
    const qb = this.repo
      .createQueryBuilder('task')
      .where('task.tenant_id = :tenantId', { tenantId })
      .orderBy('task.created_at', 'DESC');

    if (filters.warehouseId) {
      qb.andWhere('task.warehouse_id = :warehouseId', { warehouseId: filters.warehouseId });
    }
    if (filters.type) {
      qb.andWhere('task.type = :type', { type: filters.type });
    }
    if (filters.status) {
      qb.andWhere('task.status = :status', { status: filters.status });
    }
    if (filters.assignedTo) {
      qb.andWhere('task.assigned_to = :assignedTo', { assignedTo: filters.assignedTo });
    }

    return qb.getMany();
  }

  findById(id: string, tenantId: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  /** Worker inbox — tasks assigned to a specific user that are active */
  findMyTasks(userId: string, tenantId: string): Promise<Task[]> {
    return this.repo
      .createQueryBuilder('task')
      .where('task.assigned_to = :userId AND task.tenant_id = :tenantId', { userId, tenantId })
      .andWhere('task.status IN (:...statuses)', {
        statuses: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS],
      })
      .orderBy('task.priority', 'DESC')
      .addOrderBy('task.due_at', 'ASC', 'NULLS LAST')
      .getMany();
  }

  /**
   * Dispatcher: find the highest-priority PENDING task for a warehouse (and optionally type).
   * Used by the auto-assign algorithm.
   */
  findNextPending(warehouseId: string, tenantId: string, type?: TaskType): Promise<Task | null> {
    const priorityOrder = [
      TaskPriority.URGENT,
      TaskPriority.HIGH,
      TaskPriority.NORMAL,
      TaskPriority.LOW,
    ];

    const qb = this.repo
      .createQueryBuilder('task')
      .where(
        'task.warehouse_id = :warehouseId AND task.tenant_id = :tenantId AND task.status = :status',
        { warehouseId, tenantId, status: TaskStatus.PENDING },
      )
      .orderBy(
        `CASE task.priority
          WHEN '${TaskPriority.URGENT}' THEN 1
          WHEN '${TaskPriority.HIGH}' THEN 2
          WHEN '${TaskPriority.NORMAL}' THEN 3
          WHEN '${TaskPriority.LOW}' THEN 4
          ELSE 5
        END`,
        'ASC',
      )
      .addOrderBy('task.created_at', 'ASC')
      .limit(1);

    if (type) {
      qb.andWhere('task.type = :type', { type });
    }

    // Suppress unused variable warning (kept for documentation)
    void priorityOrder;

    return qb.getOne();
  }

  /** Count active tasks per user — used by the assignment algorithm */
  countActiveByUser(userId: string, tenantId: string): Promise<number> {
    return this.repo.count({
      where: [
        { assignedTo: userId, tenantId, status: TaskStatus.ASSIGNED },
        { assignedTo: userId, tenantId, status: TaskStatus.IN_PROGRESS },
      ],
    });
  }

  /** Find overdue tasks — due_at in the past and not yet in a terminal state */
  findOverdue(tenantId: string, warehouseId?: string): Promise<Task[]> {
    const qb = this.repo
      .createQueryBuilder('task')
      .where('task.tenant_id = :tenantId', { tenantId })
      .andWhere('task.due_at IS NOT NULL AND task.due_at < NOW()')
      .andWhere('task.status NOT IN (:...terminal)', {
        terminal: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.FAILED],
      })
      .orderBy('task.due_at', 'ASC');

    if (warehouseId) {
      qb.andWhere('task.warehouse_id = :warehouseId', { warehouseId });
    }

    return qb.getMany();
  }

  save(task: Task): Promise<Task> {
    return this.repo.save(task);
  }
}
