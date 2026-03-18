import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../shared/exceptions/app.exception';
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  TASK_TERMINAL_STATUSES,
} from '../../domain/entities/task.entity';
import { TaskFilters, TaskRepository } from '../../infrastructure/repositories/task.repository';
import { UserRepository } from '../../../auth/infrastructure/repositories/user.repository';
import { AssignTaskDto } from '../dto/assign-task.dto';
import { CompleteTaskDto } from '../dto/complete-task.dto';
import { CreateTaskDto } from '../dto/create-task.dto';
import { TaskResponseDto } from '../dto/task-response.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBusService,
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────────

  async listTasks(tenantId: string, filters: TaskFilters = {}): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findAllByTenant(tenantId, filters);
    return tasks.map(this.toResponse);
  }

  async getTask(tenantId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await this.taskRepository.findById(taskId, tenantId);
    if (!task) throw AppException.notFound('Task', taskId);
    return this.toResponse(task);
  }

  /**
   * Worker inbox — active tasks (ASSIGNED or IN_PROGRESS) for the calling user,
   * ordered by priority then due date.
   */
  async getMyTasks(tenantId: string, userId: string): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findMyTasks(userId, tenantId);
    return tasks.map(this.toResponse);
  }

  async getOverdueTasks(tenantId: string, warehouseId?: string): Promise<TaskResponseDto[]> {
    const tasks = await this.taskRepository.findOverdue(tenantId, warehouseId);
    return tasks.map(this.toResponse);
  }

  // ── Commands ─────────────────────────────────────────────────────────────────

  async createTask(tenantId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    const now = new Date();

    const task = Object.assign(new Task(), {
      tenantId,
      warehouseId: dto.warehouseId,
      type: dto.type,
      status: dto.assignedTo ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
      priority: dto.priority ?? TaskPriority.NORMAL,
      title: dto.title,
      description: dto.description ?? null,
      assignedTo: dto.assignedTo ?? null,
      assignedAt: dto.assignedTo ? now : null,
      startedAt: null,
      completedAt: null,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      orderId: dto.orderId ?? null,
      inventoryMovementId: dto.inventoryMovementId ?? null,
      fromCellId: dto.fromCellId ?? null,
      toCellId: dto.toCellId ?? null,
      productId: dto.productId ?? null,
      quantity: dto.quantity ?? null,
      notes: dto.notes ?? null,
      metadata: dto.metadata ?? {},
    });

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task "${saved.title}" (${saved.type}) created for tenant ${tenantId}`);

    if (saved.assignedTo) {
      void this.eventBus.publish({
        eventName: 'task.assigned',
        occurredAt: now,
        aggregateId: saved.id,
        tenantId,
        payload: { taskId: saved.id, assignedTo: saved.assignedTo, type: saved.type },
      });
    }

    return this.toResponse(saved);
  }

  /**
   * Assign a PENDING task to a specific worker.
   * Managers / dispatchers call this endpoint.
   */
  async assignTask(tenantId: string, taskId: string, dto: AssignTaskDto): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (task.status !== TaskStatus.PENDING) {
      throw AppException.unprocessable(
        `Task can only be assigned from PENDING status (current: ${task.status})`,
      );
    }

    const user = await this.userRepository.findById(dto.userId, tenantId);
    if (!user) {
      throw AppException.notFound(
        'User',
        dto.userId,
        'Пользователь с таким ID не найден в системе. Назначайте только на зарегистрированных пользователей.',
      );
    }

    if (!user.isActive) {
      throw AppException.unprocessable(
        `Cannot assign task to inactive user ${dto.userId}`,
      );
    }

    const now = new Date();
    task.assignedTo = dto.userId;
    task.assignedAt = now;
    task.status = TaskStatus.ASSIGNED;

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} assigned to ${dto.userId}`);

    void this.eventBus.publish({
      eventName: 'task.assigned',
      occurredAt: now,
      aggregateId: saved.id,
      tenantId,
      payload: { taskId: saved.id, assignedTo: dto.userId, type: saved.type },
    });

    return this.toResponse(saved);
  }

  /**
   * Auto-assign: find the highest-priority PENDING task in the warehouse
   * and assign it to the requesting user (self-serve model for workers).
   */
  async autoAssign(
    tenantId: string,
    warehouseId: string,
    userId: string,
    type?: TaskType,
  ): Promise<TaskResponseDto> {
    const user = await this.userRepository.findById(userId, tenantId);
    if (!user) {
      throw AppException.notFound(
        'User',
        userId,
        'Текущий пользователь не найден в системе.',
      );
    }

    if (!user.isActive) {
      throw AppException.unprocessable(
        `Cannot auto-assign task to inactive user ${userId}`,
      );
    }

    const task = await this.taskRepository.findNextPending(warehouseId, tenantId, type);

    if (!task) {
      throw AppException.notFound('PendingTask', `${type ?? 'any'} in warehouse ${warehouseId}`);
    }

    const now = new Date();
    task.assignedTo = userId;
    task.assignedAt = now;
    task.status = TaskStatus.ASSIGNED;

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task ${saved.id} auto-assigned to ${userId}`);

    void this.eventBus.publish({
      eventName: 'task.assigned',
      occurredAt: now,
      aggregateId: saved.id,
      tenantId,
      payload: { taskId: saved.id, assignedTo: userId, type: saved.type },
    });

    return this.toResponse(saved);
  }

  /**
   * Claim a specific task by UUID — worker can self-assign a PENDING task.
   */
  async claimTask(tenantId: string, taskId: string, userId: string): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (task.status !== TaskStatus.PENDING) {
      throw AppException.unprocessable(
        `Task can only be claimed from PENDING status (current: ${task.status})`,
      );
    }

    const user = await this.userRepository.findById(userId, tenantId);
    if (!user) {
      throw AppException.notFound(
        'User',
        userId,
        'Текущий пользователь не найден в системе.',
      );
    }

    if (!user.isActive) {
      throw AppException.unprocessable(
        `Cannot claim task with inactive user account ${userId}`,
      );
    }

    const now = new Date();
    task.assignedTo = userId;
    task.assignedAt = now;
    task.status = TaskStatus.ASSIGNED;

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} claimed by ${userId}`);

    void this.eventBus.publish({
      eventName: 'task.assigned',
      occurredAt: now,
      aggregateId: saved.id,
      tenantId,
      payload: { taskId: saved.id, assignedTo: userId, type: saved.type },
    });

    return this.toResponse(saved);
  }

  /**
   * Start a task — ASSIGNED → IN_PROGRESS.
   * The worker must be the assignee (or a manager can start on their behalf).
   */
  async startTask(tenantId: string, taskId: string, _userId: string): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (task.status !== TaskStatus.ASSIGNED) {
      throw AppException.unprocessable(
        `Task must be ASSIGNED before it can be started (current: ${task.status})`,
      );
    }

    const now = new Date();
    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = now;

    return this.toResponse(await this.taskRepository.save(task));
  }

  /**
   * Complete a task — IN_PROGRESS → COMPLETED.
   * Emits task.completed domain event.
   */
  async completeTask(
    tenantId: string,
    taskId: string,
    userId: string,
    dto: CompleteTaskDto = {},
  ): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw AppException.unprocessable(
        `Task must be IN_PROGRESS to complete (current: ${task.status})`,
      );
    }

    const now = new Date();
    task.status = TaskStatus.COMPLETED;
    task.completedAt = now;
    if (dto.notes) task.notes = dto.notes;

    const saved = await this.taskRepository.save(task);
    this.logger.log(`Task ${taskId} completed by ${userId}`);

    void this.eventBus.publish({
      eventName: 'task.completed',
      occurredAt: now,
      aggregateId: saved.id,
      tenantId,
      payload: {
        tenantId,
        taskId: saved.id,
        type: saved.type,
        performedBy: userId,
        orderId: saved.orderId,
        inventoryMovementId: saved.inventoryMovementId,
      },
    });

    return this.toResponse(saved);
  }

  /**
   * Fail a task — IN_PROGRESS → FAILED.
   * Records failure notes for supervisor review.
   */
  async failTask(
    tenantId: string,
    taskId: string,
    userId: string,
    dto: CompleteTaskDto = {},
  ): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw AppException.unprocessable(
        `Task must be IN_PROGRESS to mark as failed (current: ${task.status})`,
      );
    }

    task.status = TaskStatus.FAILED;
    if (dto.notes) task.notes = dto.notes;

    const saved = await this.taskRepository.save(task);
    this.logger.warn(`Task ${taskId} marked as FAILED by ${userId}`);
    return this.toResponse(saved);
  }

  /** Cancel any non-terminal task */
  async cancelTask(tenantId: string, taskId: string): Promise<TaskResponseDto> {
    const task = await this.requireTask(tenantId, taskId);

    if (TASK_TERMINAL_STATUSES.has(task.status)) {
      throw AppException.unprocessable(
        `Task is in terminal status "${task.status}" and cannot be cancelled`,
      );
    }

    task.status = TaskStatus.CANCELLED;
    return this.toResponse(await this.taskRepository.save(task));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async requireTask(tenantId: string, taskId: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId, tenantId);
    if (!task) throw AppException.notFound('Task', taskId);
    return task;
  }

  private toResponse(task: Task): TaskResponseDto {
    return {
      id: task.id,
      tenantId: task.tenantId,
      warehouseId: task.warehouseId,
      orderId: task.orderId,
      inventoryMovementId: task.inventoryMovementId,
      type: task.type,
      status: task.status,
      priority: task.priority,
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      assignedAt: task.assignedAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      dueAt: task.dueAt,
      fromCellId: task.fromCellId,
      toCellId: task.toCellId,
      productId: task.productId,
      quantity: task.quantity,
      notes: task.notes,
      metadata: task.metadata,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
