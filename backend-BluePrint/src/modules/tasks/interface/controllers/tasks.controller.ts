import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { RolesGuard } from '../../../../shared/guards/roles.guard';
import { Role } from '../../../../shared/types/role.enum';
import { TaskStatus, TaskType } from '../../domain/entities/task.entity';
import { TasksService } from '../../application/services/tasks.service';
import { AssignTaskDto } from '../../application/dto/assign-task.dto';
import { CompleteTaskDto } from '../../application/dto/complete-task.dto';
import { CreateTaskDto } from '../../application/dto/create-task.dto';
import { TaskResponseDto } from '../../application/dto/task-response.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // ── List / Query ──────────────────────────────────────────────────────────────

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Список всех задач (вид для менеджера)' })
  @ApiQuery({ name: 'warehouseId', type: String, required: false })
  @ApiQuery({ name: 'type', enum: TaskType, required: false })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiOkResponse({ type: [TaskResponseDto] })
  listTasks(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: TaskType,
    @Query('status') status?: TaskStatus,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.listTasks(user.tenantId, { warehouseId, type, status });
  }

  @Get('my')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({
    summary: 'Мои задачи — активные задачи, назначенные на текущего пользователя',
    description:
      'Возвращает задачи в статусах ASSIGNED и IN_PROGRESS для текущего пользователя, ' +
      'отсортированные по приоритету и сроку выполнения.',
  })
  @ApiOkResponse({ type: [TaskResponseDto] })
  getMyTasks(@CurrentUser() user: JwtPayload): Promise<TaskResponseDto[]> {
    return this.tasksService.getMyTasks(user.tenantId, user.sub);
  }

  @Get('overdue')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Список просроченных задач (срок выполнения истек, задача не завершена)' })
  @ApiQuery({ name: 'warehouseId', type: String, required: false })
  @ApiOkResponse({ type: [TaskResponseDto] })
  getOverdue(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId') warehouseId?: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.getOverdueTasks(user.tenantId, warehouseId);
  }

  @Get(':taskId')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST, Role.WORKER)
  @ApiOperation({ summary: 'Получить данные одной задачи по ID' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  getTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.getTask(user.tenantId, taskId);
  }

  // ── Create ────────────────────────────────────────────────────────────────────

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Создать новую задачу' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  createTask(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.createTask(user.tenantId, dto);
  }

  // ── Assignment ────────────────────────────────────────────────────────────────

  @Patch(':taskId/assign')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Назначить задачу на конкретного сотрудника' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  assignTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AssignTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.assignTask(user.tenantId, taskId, dto);
  }

  @Post('auto-assign')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({
    summary: 'Авто-назначение следующей задачи',
    description:
      'Находит наиболее приоритетную задачу в статусе PENDING и назначает её на текущего пользователя.',
  })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiQuery({ name: 'type', enum: TaskType, required: false })
  @ApiOkResponse({ type: TaskResponseDto })
  autoAssign(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
    @Query('type') type?: TaskType,
  ): Promise<TaskResponseDto> {
    return this.tasksService.autoAssign(user.tenantId, warehouseId, user.sub, type);
  }

  // ── Lifecycle transitions ─────────────────────────────────────────────────────

  @Post(':taskId/start')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Взять задачу в работу: ASSIGNED → IN_PROGRESS' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  startTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.startTask(user.tenantId, taskId, user.sub);
  }

  @Post(':taskId/complete')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Завершить задачу: IN_PROGRESS → COMPLETED' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  completeTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.completeTask(user.tenantId, taskId, user.sub, dto);
  }

  @Post(':taskId/fail')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.WORKER)
  @ApiOperation({ summary: 'Пометить задачу как проваленную: IN_PROGRESS → FAILED' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  failTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: CompleteTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.failTask(user.tenantId, taskId, user.sub, dto);
  }

  @Post(':taskId/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Отменить задачу (из любого нетерминального статуса)' })
  @ApiParam({ name: 'taskId', type: String })
  @ApiOkResponse({ type: TaskResponseDto })
  cancelTask(
    @CurrentUser() user: JwtPayload,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.cancelTask(user.tenantId, taskId);
  }
}
