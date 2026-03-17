import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  DashboardResponseDto,
  EmployeeKpiDto,
  InventorySummaryDto,
  OrdersSummaryDto,
  TasksSummaryDto,
  TaskTypeBreakdownDto,
  WarehouseUtilizationDto,
} from '../dto/analytics-response.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly dataSource: DataSource) {}

  // ── Dashboard ─────────────────────────────────────────────────────────────────

  async getDashboard(tenantId: string, warehouseId: string): Promise<DashboardResponseDto> {
    const [orders, inventory, tasks, utilization] = await Promise.all([
      this.getOrdersSummary(tenantId, warehouseId),
      this.getInventorySummary(tenantId, warehouseId),
      this.getTasksSummary(tenantId, warehouseId),
      this.getWarehouseUtilization(tenantId, warehouseId),
    ]);

    return {
      warehouseId,
      generatedAt: new Date().toISOString(),
      orders,
      inventory,
      tasks,
      utilization,
    };
  }

  // ── Orders Summary ────────────────────────────────────────────────────────────

  async getOrdersSummary(tenantId: string, warehouseId: string): Promise<OrdersSummaryDto> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                       AS total,
        COUNT(*) FILTER (WHERE status = 'DRAFT')                      AS draft,
        COUNT(*) FILTER (WHERE status = 'CONFIRMED')                   AS confirmed,
        COUNT(*) FILTER (WHERE status = 'IN_PICKING')                  AS in_picking,
        COUNT(*) FILTER (WHERE status = 'PICKED')                      AS picked,
        COUNT(*) FILTER (WHERE status = 'IN_PACKING')                  AS in_packing,
        COUNT(*) FILTER (WHERE status = 'PACKED')                      AS packed,
        COUNT(*) FILTER (WHERE status = 'SHIPPED')                     AS shipped,
        COUNT(*) FILTER (WHERE status = 'DELIVERED')                   AS delivered,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')                   AS cancelled,
        COUNT(*) FILTER (WHERE status = 'RETURNED')                    AS returned
      FROM orders
      WHERE tenant_id = $1
        AND warehouse_id = $2
        AND created_at >= NOW() - INTERVAL '30 days'
      `,
      [tenantId, warehouseId],
    );

    const r = rows[0];
    return {
      total: Number(r.total),
      draft: Number(r.draft),
      confirmed: Number(r.confirmed),
      inPicking: Number(r.in_picking),
      picked: Number(r.picked),
      inPacking: Number(r.in_packing),
      packed: Number(r.packed),
      shipped: Number(r.shipped),
      delivered: Number(r.delivered),
      cancelled: Number(r.cancelled),
      returned: Number(r.returned),
    };
  }

  // ── Inventory Summary ─────────────────────────────────────────────────────────

  async getInventorySummary(tenantId: string, warehouseId: string): Promise<InventorySummaryDto> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COUNT(DISTINCT ii.product_id)                               AS total_skus,
        COALESCE(SUM(ii.quantity), 0)                               AS total_units,
        COUNT(*) FILTER (WHERE ii.quantity <= p.min_stock_level
                           AND p.min_stock_level > 0)               AS low_stock_count,
        COUNT(*) FILTER (WHERE ii.quantity = 0)                     AS out_of_stock_count
      FROM inventory_items ii
      JOIN products p ON p.id = ii.product_id AND p.tenant_id = $1
      WHERE ii.tenant_id = $1
        AND ii.warehouse_id = $2
      `,
      [tenantId, warehouseId],
    );

    const r = rows[0];
    return {
      totalSkus: Number(r.total_skus),
      totalUnits: Number(r.total_units),
      lowStockCount: Number(r.low_stock_count),
      outOfStockCount: Number(r.out_of_stock_count),
    };
  }

  // ── Tasks Summary ─────────────────────────────────────────────────────────────

  async getTasksSummary(tenantId: string, warehouseId: string): Promise<TasksSummaryDto> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                    AS today_total,
        COUNT(*) FILTER (WHERE status = 'PENDING')                  AS pending,
        COUNT(*) FILTER (WHERE status = 'ASSIGNED')                 AS assigned,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')              AS in_progress,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')                AS completed,
        COUNT(*) FILTER (WHERE status = 'FAILED')                   AS failed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED')                AS cancelled
      FROM tasks
      WHERE tenant_id = $1
        AND warehouse_id = $2
        AND created_at >= CURRENT_DATE
      `,
      [tenantId, warehouseId],
    );

    const r = rows[0];
    return {
      todayTotal: Number(r.today_total),
      pending: Number(r.pending),
      assigned: Number(r.assigned),
      inProgress: Number(r.in_progress),
      completed: Number(r.completed),
      failed: Number(r.failed),
      cancelled: Number(r.cancelled),
    };
  }

  // ── Warehouse Utilization ─────────────────────────────────────────────────────

  async getWarehouseUtilization(
    tenantId: string,
    warehouseId: string,
  ): Promise<WarehouseUtilizationDto> {
    const rows = await this.dataSource.query(
      `
      SELECT
        COUNT(*)                                                AS total_cells,
        COUNT(*) FILTER (WHERE is_occupied = true)             AS occupied_cells,
        ROUND(
          COUNT(*) FILTER (WHERE is_occupied = true)::NUMERIC
          / NULLIF(COUNT(*), 0) * 100,
          2
        )                                                       AS utilization_pct
      FROM cells
      WHERE tenant_id = $1
        AND warehouse_id = $2
        AND is_active = true
      `,
      [tenantId, warehouseId],
    );

    const r = rows[0];
    return {
      totalCells: Number(r.total_cells),
      occupiedCells: Number(r.occupied_cells),
      utilizationPct: Number(r.utilization_pct ?? 0),
    };
  }

  // ── Employee KPI ──────────────────────────────────────────────────────────────

  /**
   * Compute per-employee KPIs for a date range.
   *
   * @param tenantId  Tenant scope
   * @param userId    User to analyse
   * @param from      ISO date string (inclusive start)
   * @param to        ISO date string (exclusive end — defaults to now)
   */
  async getEmployeeKpi(
    tenantId: string,
    userId: string,
    from: string,
    to?: string,
  ): Promise<EmployeeKpiDto> {
    const toDate = to ?? new Date().toISOString();

    const rows = await this.dataSource.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'COMPLETED')            AS tasks_completed,
        COUNT(*) FILTER (WHERE status = 'FAILED')               AS tasks_failed,
        AVG(
          EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 60.0
        ) FILTER (WHERE status = 'COMPLETED'
                    AND completed_at IS NOT NULL
                    AND assigned_at  IS NOT NULL)               AS avg_completion_minutes,

        -- Type breakdown (completed only)
        COUNT(*) FILTER (WHERE type = 'PICK'      AND status = 'COMPLETED') AS pick_count,
        COUNT(*) FILTER (WHERE type = 'PACK'      AND status = 'COMPLETED') AS pack_count,
        COUNT(*) FILTER (WHERE type = 'RECEIVE'   AND status = 'COMPLETED') AS receive_count,
        COUNT(*) FILTER (WHERE type = 'PUT_AWAY'  AND status = 'COMPLETED') AS put_away_count,
        COUNT(*) FILTER (WHERE type = 'TRANSFER'  AND status = 'COMPLETED') AS transfer_count,
        COUNT(*) FILTER (WHERE type = 'COUNT'     AND status = 'COMPLETED') AS count_count,
        COUNT(*) FILTER (WHERE type = 'INSPECT'   AND status = 'COMPLETED') AS inspect_count,
        COUNT(*) FILTER (WHERE type = 'REPLENISH' AND status = 'COMPLETED') AS replenish_count
      FROM tasks
      WHERE tenant_id    = $1
        AND assigned_to  = $2
        AND created_at  >= $3::timestamptz
        AND created_at   < $4::timestamptz
      `,
      [tenantId, userId, from, toDate],
    );

    const r = rows[0];
    const completed = Number(r.tasks_completed);
    const failed = Number(r.tasks_failed);
    const total = completed + failed;

    const byType: TaskTypeBreakdownDto = {
      PICK: Number(r.pick_count) || undefined,
      PACK: Number(r.pack_count) || undefined,
      RECEIVE: Number(r.receive_count) || undefined,
      PUT_AWAY: Number(r.put_away_count) || undefined,
      TRANSFER: Number(r.transfer_count) || undefined,
      COUNT: Number(r.count_count) || undefined,
      INSPECT: Number(r.inspect_count) || undefined,
      REPLENISH: Number(r.replenish_count) || undefined,
    };

    // Strip undefined entries
    (Object.keys(byType) as (keyof TaskTypeBreakdownDto)[]).forEach((k) => {
      if (byType[k] === undefined) delete byType[k];
    });

    return {
      userId,
      from,
      to: toDate,
      tasksCompleted: completed,
      tasksFailed: failed,
      avgCompletionMinutes:
        r.avg_completion_minutes != null
          ? Math.round(Number(r.avg_completion_minutes) * 10) / 10
          : null,
      accuracyRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : null,
      byType,
    };
  }
}
