import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TaskPriority, TaskType } from '../../../tasks/domain/entities/task.entity';
import { TasksService } from '../../../tasks/application/services/tasks.service';
import {
  buildDailySeries,
  fitHoltWinters,
  forecast,
  timeToDepletion,
} from '../../domain/forecasting/holt-winters';
import { ReplenishmentQueryDto } from '../dto/optimization.dto';

export interface ReplenishmentItem {
  productId: string;
  sku: string;
  name: string;
  availableQty: number;
  pickCellId: string | null;
  model: {
    alpha: number;
    gamma: number | null;
    rmse: number;
    seasonalityUsed: boolean;
    observations: number;
  };
  avgDailyDemand: number;
  /** Point estimate, hours until the available stock reaches zero (null = beyond horizon). */
  hoursToZero: number | null;
  /** Conservative (90 % demand quantile) estimate, hours. */
  hoursToZeroConservative: number | null;
  /** Hours we have before replenishment must be DONE (lead time + safety). */
  deadlineHours: number;
  needsReplenishment: boolean;
  urgency: TaskPriority;
  recommendedQty: number;
  openReplenishTask: boolean;
}

export interface ReplenishmentForecast {
  warehouseId: string;
  generatedAt: string;
  windowDays: number;
  /** Median of the per-SKU tuned α — shows how this warehouse's demand behaves. */
  medianAlpha: number | null;
  items: ReplenishmentItem[];
}

const Z_90 = 1.2816;

@Injectable()
export class ReplenishmentService {
  private readonly logger = new Logger(ReplenishmentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tasksService: TasksService,
  ) {}

  async forecast(
    tenantId: string,
    warehouseId: string,
    q: ReplenishmentQueryDto = {},
  ): Promise<ReplenishmentForecast> {
    const windowDays = q.windowDays ?? 90;
    const leadH = (q.leadTimeHours ?? 24);
    const safetyH = (q.safetyHours ?? 12);
    const horizonDays = 60;

    const demandRows: Array<{ product_id: string; day: string; qty: string }> =
      await this.dataSource.query(
        `
        SELECT product_id,
               to_char(COALESCE(completed_at, created_at)::date, 'YYYY-MM-DD') AS day,
               SUM(quantity) AS qty
        FROM inventory_movements
        WHERE tenant_id = $1 AND warehouse_id = $2
          AND type = 'OUTBOUND' AND status = 'COMPLETED'
          AND COALESCE(completed_at, created_at) >= NOW() - ($3 || ' days')::interval
        GROUP BY product_id, 2
        `,
        [tenantId, warehouseId, String(windowDays)],
      );

    const stockRows: Array<{
      product_id: string;
      sku: string;
      name: string;
      available: string;
      max_stock_level: number | null;
      min_stock_level: number;
      pick_cell_id: string | null;
    }> = await this.dataSource.query(
      `
      SELECT p.id AS product_id, p.sku, p.name, p.max_stock_level, p.min_stock_level,
             COALESCE(SUM(ii.quantity - ii.reserved_quantity), 0) AS available,
             (ARRAY_AGG(ii.cell_id ORDER BY ii.quantity DESC) FILTER (WHERE ii.cell_id IS NOT NULL))[1] AS pick_cell_id
      FROM products p
      JOIN inventory_items ii ON ii.product_id = p.id AND ii.tenant_id = p.tenant_id
      WHERE p.tenant_id = $1 AND ii.warehouse_id = $2 AND p.is_active = true
      GROUP BY p.id
      `,
      [tenantId, warehouseId],
    );

    const openTasks: Array<{ product_id: string }> = await this.dataSource.query(
      `SELECT DISTINCT product_id FROM tasks
       WHERE tenant_id = $1 AND warehouse_id = $2 AND type = 'REPLENISH'
         AND status IN ('PENDING','ASSIGNED','IN_PROGRESS') AND product_id IS NOT NULL`,
      [tenantId, warehouseId],
    );
    const openSet = new Set(openTasks.map((t) => t.product_id));

    const [{ today }] = await this.dataSource.query(`SELECT to_char(CURRENT_DATE, 'YYYY-MM-DD') AS today`);
    const byProduct = new Map<string, Array<{ day: string; qty: number }>>();
    for (const r of demandRows) {
      const list = byProduct.get(r.product_id) ?? [];
      list.push({ day: r.day, qty: Number(r.qty) });
      byProduct.set(r.product_id, list);
    }

    const items: ReplenishmentItem[] = [];
    for (const s of stockRows) {
      const rows = byProduct.get(s.product_id) ?? [];
      const series = buildDailySeries(rows, today, windowDays);
      const fit = fitHoltWinters(series, { window: windowDays });
      const daily = forecast(fit, horizonDays);
      const available = Number(s.available);

      const point = timeToDepletion(available, daily);
      const safe = timeToDepletion(available, daily, fit.residualStd, Z_90);
      const toHours = (d: number | null): number | null => (d === null ? null : Math.round(d * 24 * 10) / 10);
      const hoursToZero = toHours(point);
      const hoursSafe = toHours(safe);
      const deadlineHours = leadH + safetyH;

      const avgDaily = daily.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
      const needs = series.some((v) => v > 0) && hoursSafe !== null && hoursSafe <= deadlineHours;

      const target =
        s.max_stock_level ?? Math.ceil(avgDaily * (leadH + safetyH) / 24 + avgDaily * 7 + Z_90 * fit.residualStd * Math.sqrt(7));
      const recommended = Math.max(0, Math.ceil(target - available));

      let urgency = TaskPriority.NORMAL;
      if (hoursSafe !== null) {
        if (hoursSafe <= leadH * 0.5 || available <= 0) urgency = TaskPriority.URGENT;
        else if (hoursSafe <= leadH) urgency = TaskPriority.HIGH;
      }

      items.push({
        productId: s.product_id,
        sku: s.sku,
        name: s.name,
        availableQty: available,
        pickCellId: s.pick_cell_id,
        model: {
          alpha: fit.alpha,
          gamma: fit.gamma,
          rmse: Math.round(fit.rmse * 100) / 100,
          seasonalityUsed: fit.seasonalityUsed,
          observations: fit.n,
        },
        avgDailyDemand: Math.round(avgDaily * 100) / 100,
        hoursToZero,
        hoursToZeroConservative: hoursSafe,
        deadlineHours,
        needsReplenishment: needs && recommended > 0,
        urgency,
        recommendedQty: recommended,
        openReplenishTask: openSet.has(s.product_id),
      });
    }

    items.sort((a, b) => (a.hoursToZeroConservative ?? Infinity) - (b.hoursToZeroConservative ?? Infinity));
    const alphas = items.filter((i) => i.model.observations > 0 && i.avgDailyDemand > 0).map((i) => i.model.alpha).sort((a, b) => a - b);

    return {
      warehouseId,
      generatedAt: new Date().toISOString(),
      windowDays,
      medianAlpha: alphas.length ? alphas[Math.floor(alphas.length / 2)] : null,
      items,
    };
  }

  /** Create REPLENISH tasks BEFORE the cell is empty. Idempotent: skips SKUs with an open task. */
  async generateTasks(
    tenantId: string,
    warehouseId: string,
    q: ReplenishmentQueryDto = {},
  ): Promise<{ created: number; skipped: number; taskIds: string[] }> {
    const fc = await this.forecast(tenantId, warehouseId, q);
    const candidates = fc.items.filter((i) => i.needsReplenishment);
    const taskIds: string[] = [];
    let skipped = 0;

    for (const it of candidates) {
      if (it.openReplenishTask) {
        skipped++;
        continue;
      }
      const dueAt = new Date(Date.now() + Math.max(0, (it.hoursToZeroConservative ?? 0)) * 3_600_000);
      const task = await this.tasksService.createTask(tenantId, {
        warehouseId,
        type: TaskType.REPLENISH,
        priority: it.urgency,
        title: `Пополнить ${it.sku}`,
        description:
          `Прогноз обнуления через ${it.hoursToZero ?? '—'} ч (консервативно ${it.hoursToZeroConservative} ч). ` +
          `Модель: α=${it.model.alpha}${it.model.seasonalityUsed ? ', сезонность 7д' : ''}.`,
        productId: it.productId,
        toCellId: it.pickCellId ?? undefined,
        quantity: Math.max(1, it.recommendedQty),
        dueAt: dueAt.toISOString(),
        metadata: { source: 'predictive-replenishment', alpha: it.model.alpha },
      });
      taskIds.push(task.id);
    }
    this.logger.log(`Predictive replenishment: ${taskIds.length} tasks created, ${skipped} skipped (tenant ${tenantId})`);
    return { created: taskIds.length, skipped, taskIds };
  }
}
