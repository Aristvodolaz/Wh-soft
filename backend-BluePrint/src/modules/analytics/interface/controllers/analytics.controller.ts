import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
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
import { AnalyticsService } from '../../application/services/analytics.service';
import {
  DashboardResponseDto,
  EmployeeKpiDto,
  InventorySummaryDto,
  OrdersSummaryDto,
  TasksSummaryDto,
  WarehouseUtilizationDto,
} from '../../application/dto/analytics-response.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ── Composite dashboard ───────────────────────────────────────────────────────

  @Get('dashboard')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'Обзорный дашборд склада',
    description:
      'Возвращает сводку по заказам (за последние 30 дней), текущие остатки, задачи (на сегодня) ' +
      'и загруженность ячеек для указанного склада в одном запросе.',
  })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: DashboardResponseDto })
  getDashboard(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<DashboardResponseDto> {
    return this.analyticsService.getDashboard(user.tenantId, warehouseId);
  }

  // ── Individual drill-downs ────────────────────────────────────────────────────

  @Get('orders')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Сводка по заказам (за последние 30 дней)' })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: OrdersSummaryDto })
  getOrdersSummary(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<OrdersSummaryDto> {
    return this.analyticsService.getOrdersSummary(user.tenantId, warehouseId);
  }

  @Get('inventory')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({
    summary:
      'Сводка по инвентаризации — товары, ед. хранения, низкие остатки и отсутствие на складе',
  })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: InventorySummaryDto })
  getInventorySummary(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<InventorySummaryDto> {
    return this.analyticsService.getInventorySummary(user.tenantId, warehouseId);
  }

  @Get('tasks')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Статистика задач на сегодня по статусам' })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: TasksSummaryDto })
  getTasksSummary(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<TasksSummaryDto> {
    return this.analyticsService.getTasksSummary(user.tenantId, warehouseId);
  }

  @Get('utilization')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({ summary: 'Заполненность ячеек склада (% занятых)' })
  @ApiQuery({ name: 'warehouseId', type: String, required: true })
  @ApiOkResponse({ type: WarehouseUtilizationDto })
  getUtilization(
    @CurrentUser() user: JwtPayload,
    @Query('warehouseId', ParseUUIDPipe) warehouseId: string,
  ): Promise<WarehouseUtilizationDto> {
    return this.analyticsService.getWarehouseUtilization(user.tenantId, warehouseId);
  }

  // ── Employee KPI ──────────────────────────────────────────────────────────────

  @Get('employees/:userId/kpi')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_ADMIN, Role.MANAGER, Role.ANALYST)
  @ApiOperation({
    summary: 'KPI эффективности сотрудника за период',
    description:
      'Возвращает количество выполненных/проваленных задач, среднее время выполнения, ' +
      'показатель точности и разбивку по типам задач для пользователя в диапазоне [from, to).',
  })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({
    name: 'from',
    type: String,
    required: true,
    example: '2026-03-01T00:00:00Z',
    description: 'Inclusive start (ISO 8601)',
  })
  @ApiQuery({
    name: 'to',
    type: String,
    required: false,
    example: '2026-03-17T00:00:00Z',
    description: 'Exclusive end (ISO 8601). Defaults to now.',
  })
  @ApiOkResponse({ type: EmployeeKpiDto })
  getEmployeeKpi(
    @CurrentUser() user: JwtPayload,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('from') from: string,
    @Query('to') to?: string,
  ): Promise<EmployeeKpiDto> {
    return this.analyticsService.getEmployeeKpi(user.tenantId, userId, from, to);
  }
}
