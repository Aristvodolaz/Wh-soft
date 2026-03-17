import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../../shared/domain/entity.base';

export enum TaskType {
  PICK = 'PICK',
  PACK = 'PACK',
  RECEIVE = 'RECEIVE',
  PUT_AWAY = 'PUT_AWAY',
  TRANSFER = 'TRANSFER',
  COUNT = 'COUNT',
  INSPECT = 'INSPECT',
  REPLENISH = 'REPLENISH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

/** Terminal states — no further transitions allowed */
export const TASK_TERMINAL_STATUSES = new Set<TaskStatus>([
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
  TaskStatus.FAILED,
]);

/** Priority sort order (higher number = higher urgency) */
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  [TaskPriority.LOW]: 1,
  [TaskPriority.NORMAL]: 2,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.URGENT]: 4,
};

@Entity('tasks')
export class Task extends BaseEntity {
  @Column({ name: 'warehouse_id', type: 'uuid' })
  warehouseId: string;

  @Column({ name: 'order_id', type: 'uuid', nullable: true, default: null })
  orderId: string | null;

  @Column({ name: 'inventory_movement_id', type: 'uuid', nullable: true, default: null })
  inventoryMovementId: string | null;

  @Column({ type: 'enum', enum: TaskType, enumName: 'task_type_enum' })
  type: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    enumName: 'task_status_enum',
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    enumName: 'task_priority_enum',
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true, default: null })
  assignedTo: string | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true, default: null })
  assignedAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true, default: null })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true, default: null })
  completedAt: Date | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true, default: null })
  dueAt: Date | null;

  @Column({ name: 'from_cell_id', type: 'uuid', nullable: true, default: null })
  fromCellId: string | null;

  @Column({ name: 'to_cell_id', type: 'uuid', nullable: true, default: null })
  toCellId: string | null;

  @Column({ name: 'product_id', type: 'uuid', nullable: true, default: null })
  productId: string | null;

  @Column({ type: 'int', nullable: true, default: null })
  quantity: number | null;

  @Column({ type: 'text', nullable: true, default: null })
  notes: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;
}
