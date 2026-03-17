/** Must match backend TaskType (task.entity.ts) */
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
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum TaskPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface Task {
  id: string
  tenantId: string
  warehouseId: string
  orderId?: string
  inventoryMovementId?: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  title: string
  description?: string
  assignedTo?: string
  assignedAt?: string
  startedAt?: string
  completedAt?: string
  dueAt?: string
  fromCellId?: string
  toCellId?: string
  productId?: string
  quantity?: number
  notes?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateTaskDto {
  warehouseId: string
  type: TaskType
  title: string
  priority?: TaskPriority
  description?: string
  assignedTo?: string
  orderId?: string
  inventoryMovementId?: string
  fromCellId?: string
  toCellId?: string
  productId?: string
  quantity?: number
  notes?: string
  dueAt?: string
  metadata?: Record<string, unknown>
}

export interface AssignTaskDto {
  userId: string
}

export interface CompleteTaskDto {
  notes?: string
}

/** Human-readable labels */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.PENDING]: 'Ожидает',
  [TaskStatus.ASSIGNED]: 'Назначена',
  [TaskStatus.IN_PROGRESS]: 'В работе',
  [TaskStatus.COMPLETED]: 'Выполнена',
  [TaskStatus.FAILED]: 'Провалена',
  [TaskStatus.CANCELLED]: 'Отменена',
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'Низкий',
  [TaskPriority.NORMAL]: 'Обычный',
  [TaskPriority.HIGH]: 'Высокий',
  [TaskPriority.URGENT]: 'Срочный',
}

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.PICK]: 'Сборка',
  [TaskType.PACK]: 'Упаковка',
  [TaskType.RECEIVE]: 'Приёмка',
  [TaskType.PUT_AWAY]: 'Размещение',
  [TaskType.TRANSFER]: 'Перемещение',
  [TaskType.COUNT]: 'Инвентаризация',
  [TaskType.INSPECT]: 'Инспекция',
  [TaskType.REPLENISH]: 'Пополнение',
}
