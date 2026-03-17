import { Test, TestingModule } from '@nestjs/testing';
import { EventBusService } from '../../../../../infrastructure/event-bus/event-bus.service';
import { AppException } from '../../../../../shared/exceptions/app.exception';
import { Task, TaskPriority, TaskStatus, TaskType } from '../../../domain/entities/task.entity';
import { TaskRepository } from '../../../infrastructure/repositories/task.repository';
import { TasksService } from '../tasks.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-uuid';
const WH_ID = 'wh-uuid';
const TASK_ID = 'task-uuid';
const USER_ID = 'user-uuid';

const makeTask = (overrides: Partial<Task> = {}): Task =>
  Object.assign(new Task(), {
    id: TASK_ID,
    tenantId: TENANT,
    warehouseId: WH_ID,
    orderId: null,
    inventoryMovementId: null,
    type: TaskType.PICK,
    status: TaskStatus.PENDING,
    priority: TaskPriority.NORMAL,
    title: 'Pick order items',
    description: null,
    assignedTo: null,
    assignedAt: null,
    startedAt: null,
    completedAt: null,
    dueAt: null,
    fromCellId: null,
    toCellId: null,
    productId: null,
    quantity: null,
    notes: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

// ── suite ─────────────────────────────────────────────────────────────────────

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<TaskRepository>;
  let eventBus: jest.Mocked<EventBusService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: TaskRepository,
          useValue: {
            findAllByTenant: jest.fn(),
            findById: jest.fn(),
            findMyTasks: jest.fn(),
            findNextPending: jest.fn(),
            findOverdue: jest.fn(),
            countActiveByUser: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: EventBusService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(TaskRepository);
    eventBus = module.get(EventBusService);
  });

  // ── createTask ───────────────────────────────────────────────────────────────

  describe('createTask', () => {
    it('creates a PENDING task when no assignee provided', async () => {
      const task = makeTask();
      taskRepository.save.mockResolvedValueOnce(task);

      const result = await service.createTask(TENANT, {
        warehouseId: WH_ID,
        type: TaskType.PICK,
        title: 'Pick order items',
      });

      expect(result.status).toBe(TaskStatus.PENDING);
      expect(result.assignedTo).toBeNull();
      expect(eventBus.publish).not.toHaveBeenCalled();
    });

    it('creates an ASSIGNED task and emits event when assignee provided', async () => {
      const task = makeTask({ status: TaskStatus.ASSIGNED, assignedTo: USER_ID });
      taskRepository.save.mockResolvedValueOnce(task);

      const result = await service.createTask(TENANT, {
        warehouseId: WH_ID,
        type: TaskType.PICK,
        title: 'Pick order items',
        assignedTo: USER_ID,
      });

      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'task.assigned' }),
      );
    });
  });

  // ── getTask ───────────────────────────────────────────────────────────────────

  describe('getTask', () => {
    it('returns the task when found', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask());
      const result = await service.getTask(TENANT, TASK_ID);
      expect(result.id).toBe(TASK_ID);
    });

    it('throws 404 when task not found', async () => {
      taskRepository.findById.mockResolvedValueOnce(null);
      await expect(service.getTask(TENANT, 'ghost')).rejects.toThrow(AppException);
    });
  });

  // ── assignTask ───────────────────────────────────────────────────────────────

  describe('assignTask', () => {
    it('assigns a PENDING task and emits task.assigned event', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask());
      const assigned = makeTask({ status: TaskStatus.ASSIGNED, assignedTo: USER_ID });
      taskRepository.save.mockResolvedValueOnce(assigned);

      const result = await service.assignTask(TENANT, TASK_ID, { userId: USER_ID });

      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(result.assignedTo).toBe(USER_ID);
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'task.assigned' }),
      );
    });

    it('throws 422 when task is not PENDING', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask({ status: TaskStatus.IN_PROGRESS }));
      await expect(service.assignTask(TENANT, TASK_ID, { userId: USER_ID })).rejects.toThrow(
        AppException,
      );
    });
  });

  // ── autoAssign ────────────────────────────────────────────────────────────────

  describe('autoAssign', () => {
    it('assigns the next pending task to the calling user', async () => {
      taskRepository.findNextPending.mockResolvedValueOnce(makeTask());
      const assigned = makeTask({ status: TaskStatus.ASSIGNED, assignedTo: USER_ID });
      taskRepository.save.mockResolvedValueOnce(assigned);

      const result = await service.autoAssign(TENANT, WH_ID, USER_ID);
      expect(result.assignedTo).toBe(USER_ID);
    });

    it('throws 404 when no PENDING task exists', async () => {
      taskRepository.findNextPending.mockResolvedValueOnce(null);
      await expect(service.autoAssign(TENANT, WH_ID, USER_ID)).rejects.toThrow(AppException);
    });
  });

  // ── startTask ─────────────────────────────────────────────────────────────────

  describe('startTask', () => {
    it('transitions ASSIGNED → IN_PROGRESS', async () => {
      taskRepository.findById.mockResolvedValueOnce(
        makeTask({ status: TaskStatus.ASSIGNED, assignedTo: USER_ID }),
      );
      const started = makeTask({ status: TaskStatus.IN_PROGRESS, startedAt: new Date() });
      taskRepository.save.mockResolvedValueOnce(started);

      const result = await service.startTask(TENANT, TASK_ID, USER_ID);
      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.startedAt).toBeDefined();
    });

    it('throws 422 when task is not ASSIGNED', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask({ status: TaskStatus.PENDING }));
      await expect(service.startTask(TENANT, TASK_ID, USER_ID)).rejects.toThrow(AppException);
    });
  });

  // ── completeTask ──────────────────────────────────────────────────────────────

  describe('completeTask', () => {
    it('transitions IN_PROGRESS → COMPLETED and emits task.completed', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask({ status: TaskStatus.IN_PROGRESS }));
      const completed = makeTask({ status: TaskStatus.COMPLETED, completedAt: new Date() });
      taskRepository.save.mockResolvedValueOnce(completed);

      const result = await service.completeTask(TENANT, TASK_ID, USER_ID);

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.completedAt).toBeDefined();
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'task.completed' }),
      );
    });

    it('throws 422 when task is not IN_PROGRESS', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask({ status: TaskStatus.ASSIGNED }));
      await expect(service.completeTask(TENANT, TASK_ID, USER_ID)).rejects.toThrow(AppException);
    });
  });

  // ── cancelTask ────────────────────────────────────────────────────────────────

  describe('cancelTask', () => {
    it('cancels a PENDING task', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask());
      const cancelled = makeTask({ status: TaskStatus.CANCELLED });
      taskRepository.save.mockResolvedValueOnce(cancelled);

      const result = await service.cancelTask(TENANT, TASK_ID);
      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    it('throws 422 when task is already COMPLETED', async () => {
      taskRepository.findById.mockResolvedValueOnce(makeTask({ status: TaskStatus.COMPLETED }));
      await expect(service.cancelTask(TENANT, TASK_ID)).rejects.toThrow(AppException);
    });
  });

  // ── getMyTasks ────────────────────────────────────────────────────────────────

  describe('getMyTasks', () => {
    it('returns assigned tasks for the user', async () => {
      taskRepository.findMyTasks.mockResolvedValueOnce([
        makeTask({ status: TaskStatus.ASSIGNED, assignedTo: USER_ID }),
      ]);

      const result = await service.getMyTasks(TENANT, USER_ID);
      expect(result).toHaveLength(1);
      expect(result[0].assignedTo).toBe(USER_ID);
    });
  });
});
