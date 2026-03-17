import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Orders Summary ────────────────────────────────────────────────────────────

export class OrdersSummaryDto {
  @ApiProperty({ description: 'Total orders in the period' }) total: number;
  @ApiProperty() draft: number;
  @ApiProperty() confirmed: number;
  @ApiProperty() inPicking: number;
  @ApiProperty() picked: number;
  @ApiProperty() inPacking: number;
  @ApiProperty() packed: number;
  @ApiProperty() shipped: number;
  @ApiProperty() delivered: number;
  @ApiProperty() cancelled: number;
  @ApiProperty() returned: number;
}

// ── Inventory Summary ─────────────────────────────────────────────────────────

export class InventorySummaryDto {
  @ApiProperty({ description: 'Distinct product SKUs in the warehouse' }) totalSkus: number;
  @ApiProperty({ description: 'Sum of all quantity across inventory items' }) totalUnits: number;
  @ApiProperty({ description: 'Items where quantity ≤ product.min_stock_level' })
  lowStockCount: number;
  @ApiProperty({ description: 'Items with quantity = 0' }) outOfStockCount: number;
}

// ── Tasks Summary ─────────────────────────────────────────────────────────────

export class TasksSummaryDto {
  @ApiProperty({ description: 'Tasks created today (00:00 UTC onward)' }) todayTotal: number;
  @ApiProperty() pending: number;
  @ApiProperty() assigned: number;
  @ApiProperty() inProgress: number;
  @ApiProperty() completed: number;
  @ApiProperty() failed: number;
  @ApiProperty() cancelled: number;
}

// ── Warehouse Utilization ─────────────────────────────────────────────────────

export class WarehouseUtilizationDto {
  @ApiProperty() totalCells: number;
  @ApiProperty() occupiedCells: number;
  @ApiProperty({ description: 'Percentage of cells occupied (0–100)' }) utilizationPct: number;
}

// ── Dashboard (composite) ─────────────────────────────────────────────────────

export class DashboardResponseDto {
  @ApiProperty() warehouseId: string;
  @ApiProperty({ description: 'UTC timestamp of the data snapshot' }) generatedAt: string;
  @ApiProperty({ type: OrdersSummaryDto }) orders: OrdersSummaryDto;
  @ApiProperty({ type: InventorySummaryDto }) inventory: InventorySummaryDto;
  @ApiProperty({ type: TasksSummaryDto }) tasks: TasksSummaryDto;
  @ApiProperty({ type: WarehouseUtilizationDto }) utilization: WarehouseUtilizationDto;
}

// ── Employee KPI ──────────────────────────────────────────────────────────────

export class TaskTypeBreakdownDto {
  @ApiPropertyOptional() PICK?: number;
  @ApiPropertyOptional() PACK?: number;
  @ApiPropertyOptional() RECEIVE?: number;
  @ApiPropertyOptional() PUT_AWAY?: number;
  @ApiPropertyOptional() TRANSFER?: number;
  @ApiPropertyOptional() COUNT?: number;
  @ApiPropertyOptional() INSPECT?: number;
  @ApiPropertyOptional() REPLENISH?: number;
}

export class EmployeeKpiDto {
  @ApiProperty() userId: string;
  @ApiProperty() from: string;
  @ApiProperty() to: string;
  @ApiProperty({ description: 'Total tasks completed in the period' }) tasksCompleted: number;
  @ApiProperty({ description: 'Tasks failed in the period' }) tasksFailed: number;
  @ApiProperty({
    description: 'Average task completion time in minutes (assigned_at → completed_at)',
    nullable: true,
  })
  avgCompletionMinutes: number | null;
  @ApiProperty({
    description: 'Task accuracy rate — completed / (completed + failed)',
    nullable: true,
  })
  accuracyRate: number | null;
  @ApiProperty({ type: TaskTypeBreakdownDto }) byType: TaskTypeBreakdownDto;
}
