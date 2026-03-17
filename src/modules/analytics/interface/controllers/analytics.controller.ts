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
    summary: 'Warehouse dashboard snapshot',
    description:
      'Returns orders (last 30 days), live inventory, tasks (today), and cell utilization ' +
      'for a given warehouse in a single request.',
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
  @ApiOperation({ summary: 'Orders summary by status (last 30 days)' })
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
  @ApiOperation({ summary: 'Inventory summary — SKUs, units, low-stock and out-of-stock counts' })
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
  @ApiOperation({ summary: "Today's task counts by status" })
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
  @ApiOperation({ summary: 'Warehouse cell utilization (% occupied)' })
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
    summary: 'Employee performance KPIs for a date range',
    description:
      'Returns tasks completed/failed, average completion time, accuracy rate, ' +
      'and a breakdown by task type for the given user within [from, to).',
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
