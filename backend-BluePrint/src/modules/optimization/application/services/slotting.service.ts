import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppException } from '../../../../shared/exceptions/app.exception';
import { TasksService } from '../../../tasks/application/services/tasks.service';
import { TaskPriority, TaskType } from '../../../tasks/domain/entities/task.entity';
import { classifyAbcXyz } from '../../domain/slotting/abc-xyz';
import {
  PlacementCheck,
  SlotCell,
  SlotSku,
  SlottingPlan,
  cellLevel,
  planSlotting,
  validatePlacement,
} from '../../domain/slotting/slotting-engine';
import { ApplySlottingDto, SlottingQueryDto } from '../dto/optimization.dto';

function definedOnly<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

interface Context {
  skus: SlotSku[];
  cells: SlotCell[];
  quantityByProduct: Map<string, number>;
}

@Injectable()
export class SlottingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tasksService: TasksService,
  ) {}

  /** ABC/XYZ matrix + travel-minimising relocation plan (dry run). */
  async plan(tenantId: string, warehouseId: string, q: SlottingQueryDto = {}): Promise<SlottingPlan> {
    const ctx = await this.loadContext(tenantId, warehouseId, q.windowWeeks ?? 12);
    return planSlotting({
      skus: ctx.skus,
      cells: ctx.cells,
      minSavingsM: q.minSavingsM,
      layout: definedOnly({ aisleSpacing: q.aisleSpacing, bayLength: q.bayLength }),
    });
  }

  /** Two-level validation of a manual product → cell assignment. */
  async validate(
    tenantId: string,
    warehouseId: string,
    productId: string,
    cellId: string,
  ): Promise<PlacementCheck & { allowed: boolean; abc: string; xyz: string }> {
    const ctx = await this.loadContext(tenantId, warehouseId, 12);
    const sku = ctx.skus.find((s) => s.productId === productId);
    if (!sku) throw AppException.notFound('Product stock', productId);
    const cell = ctx.cells.find((c) => c.cellId === cellId);
    if (!cell) throw AppException.notFound('Eligible storage cell', cellId);

    const { items } = classifyAbcXyz(ctx.skus);
    const cls = items.find((i) => i.item.productId === productId)!;
    const maxLevel = ctx.cells.reduce((m, c) => Math.max(m, cellLevel(c)), 1);
    const check = validatePlacement(sku, cell, cls.abc, maxLevel);
    return { ...check, allowed: check.hard.length === 0, abc: cls.abc, xyz: cls.xyz };
  }

  /** Turn the best relocations into TRANSFER tasks for the floor staff. */
  async apply(
    tenantId: string,
    warehouseId: string,
    dto: ApplySlottingDto,
  ): Promise<{ created: number; plan: Pick<SlottingPlan, 'baselineTravelM' | 'proposedTravelM' | 'reductionPct'> }> {
    const ctx = await this.loadContext(tenantId, warehouseId, dto.windowWeeks ?? 12);
    const plan = planSlotting({ skus: ctx.skus, cells: ctx.cells, minSavingsM: dto.minSavingsM });
    const moves = plan.moves.filter((m) => m.savedTravelM > 0).slice(0, dto.limit ?? 20);

    for (const m of moves) {
      await this.tasksService.createTask(tenantId, {
        warehouseId,
        type: TaskType.TRANSFER,
        priority: TaskPriority.LOW,
        title: `Переместить ${m.sku}: ${m.fromCode} → ${m.toCode}`,
        description:
          `Динамическое размещение (${m.abc}${m.xyz}): экономия пробега ${m.savedTravelM} м за период.` +
          (m.warnings.length ? ` Эргономика: ${m.warnings.map((w) => w.message).join('; ')}` : '') +
          ' Если целевая ячейка занята — сначала выполните связанное перемещение.',
        productId: m.productId,
        fromCellId: m.fromCellId,
        toCellId: m.toCellId,
        quantity: ctx.quantityByProduct.get(m.productId) ?? 1,
        metadata: { source: 'dynamic-slotting', savedTravelM: m.savedTravelM },
      });
    }
    return {
      created: moves.length,
      plan: {
        baselineTravelM: plan.baselineTravelM,
        proposedTravelM: plan.proposedTravelM,
        reductionPct: plan.reductionPct,
      },
    };
  }

  // ── Data ──────────────────────────────────────────────────────────────────────

  private async loadContext(tenantId: string, warehouseId: string, windowWeeks: number): Promise<Context> {
    const cellRows: Array<Record<string, string | null>> = await this.dataSource.query(
      `
      SELECT c.id, c.code, c.aisle, c.bay, c.level, c.max_weight, c.max_volume
      FROM cells c JOIN zones z ON z.id = c.zone_id
      WHERE c.tenant_id = $1 AND c.warehouse_id = $2
        AND c.is_active = true AND z.is_active = true AND z.type = 'STORAGE'
      `,
      [tenantId, warehouseId],
    );

    // Stock per (product, cell) with unit weight / volume
    const stockRows: Array<Record<string, string | null>> = await this.dataSource.query(
      `
      SELECT ii.product_id, ii.cell_id, ii.quantity, p.sku, p.weight, p.volume
      FROM inventory_items ii JOIN products p ON p.id = ii.product_id
      WHERE ii.tenant_id = $1 AND ii.warehouse_id = $2 AND ii.quantity > 0 AND ii.cell_id IS NOT NULL
      `,
      [tenantId, warehouseId],
    );

    // Demand over the rolling window: pick lines and weekly units
    const demandRows: Array<Record<string, string>> = await this.dataSource.query(
      `
      SELECT product_id,
             FLOOR((CURRENT_DATE - COALESCE(completed_at, created_at)::date) / 7)::int AS week,
             COUNT(*) AS picks, SUM(quantity) AS units
      FROM inventory_movements
      WHERE tenant_id = $1 AND warehouse_id = $2 AND type = 'OUTBOUND' AND status = 'COMPLETED'
        AND COALESCE(completed_at, created_at)::date > CURRENT_DATE - ($3::int * 7)
      GROUP BY product_id, 2
      `,
      [tenantId, warehouseId, windowWeeks],
    );

    const demand = new Map<string, { picks: number; weekly: number[] }>();
    for (const r of demandRows) {
      const d = demand.get(r.product_id) ?? { picks: 0, weekly: new Array<number>(windowWeeks).fill(0) };
      d.picks += Number(r.picks);
      const idx = windowWeeks - 1 - Number(r.week); // oldest → newest
      if (idx >= 0 && idx < windowWeeks) d.weekly[idx] += Number(r.units);
      demand.set(r.product_id, d);
    }

    // Primary pick cell = the cell holding most units of the product; other cells stay fixed.
    const best = new Map<string, Record<string, string | null>>();
    const quantityByProduct = new Map<string, number>();
    const occupiedBySecondary = new Set<string>();
    for (const r of stockRows) {
      const pid = r.product_id as string;
      const cur = best.get(pid);
      if (!cur || Number(r.quantity) > Number(cur.quantity)) {
        if (cur) occupiedBySecondary.add(cur.cell_id as string);
        best.set(pid, r);
      } else {
        occupiedBySecondary.add(r.cell_id as string);
      }
    }
    const primaryCells = new Set([...best.values()].map((r) => r.cell_id as string));

    const skus: SlotSku[] = [];
    for (const [pid, r] of best) {
      const qty = Number(r.quantity);
      quantityByProduct.set(pid, qty);
      const unitW = r.weight != null ? Number(r.weight) : null;
      const unitV = r.volume != null ? Number(r.volume) : null;
      const d = demand.get(pid);
      skus.push({
        productId: pid,
        sku: r.sku as string,
        picks: d?.picks ?? 0,
        weeklyUnits: d?.weekly ?? new Array<number>(windowWeeks).fill(0),
        currentCellId: r.cell_id as string,
        stockWeightKg: unitW != null ? unitW * qty : null,
        stockVolumeM3: unitV != null ? unitV * qty : null,
        unitWeightKg: unitW,
      });
    }

    // Eligible targets: free cells + primary cells of the SKUs being planned.
    const occupiedCells = new Set(stockRows.map((r) => r.cell_id as string));
    const cells: SlotCell[] = cellRows
      .filter((c) => {
        const id = c.id as string;
        return primaryCells.has(id) || (!occupiedCells.has(id) && !occupiedBySecondary.has(id));
      })
      .map((c) => ({
        cellId: c.id as string,
        code: c.code as string,
        aisle: c.aisle,
        bay: c.bay,
        level: c.level,
        maxWeightKg: c.max_weight != null ? Number(c.max_weight) : null,
        maxVolumeM3: c.max_volume != null ? Number(c.max_volume) : null,
      }));

    return { skus, cells, quantityByProduct };
  }
}
