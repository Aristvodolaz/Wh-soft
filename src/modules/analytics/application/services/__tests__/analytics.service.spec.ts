import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AnalyticsService } from '../analytics.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-uuid';
const WH_ID = 'wh-uuid';
const USER_ID = 'user-uuid';

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: DataSource,
          useValue: { query: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    dataSource = module.get(DataSource);
  });

  // ── getOrdersSummary ──────────────────────────────────────────────────────────

  describe('getOrdersSummary', () => {
    it('maps raw SQL row to OrdersSummaryDto', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          total: '42',
          draft: '5',
          confirmed: '8',
          in_picking: '3',
          picked: '2',
          in_packing: '1',
          packed: '4',
          shipped: '10',
          delivered: '7',
          cancelled: '1',
          returned: '1',
        },
      ]);

      const result = await service.getOrdersSummary(TENANT, WH_ID);

      expect(result.total).toBe(42);
      expect(result.draft).toBe(5);
      expect(result.delivered).toBe(7);
    });
  });

  // ── getInventorySummary ───────────────────────────────────────────────────────

  describe('getInventorySummary', () => {
    it('maps raw SQL row to InventorySummaryDto', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          total_skus: '120',
          total_units: '9400',
          low_stock_count: '3',
          out_of_stock_count: '1',
        },
      ]);

      const result = await service.getInventorySummary(TENANT, WH_ID);

      expect(result.totalSkus).toBe(120);
      expect(result.totalUnits).toBe(9400);
      expect(result.lowStockCount).toBe(3);
      expect(result.outOfStockCount).toBe(1);
    });
  });

  // ── getTasksSummary ───────────────────────────────────────────────────────────

  describe('getTasksSummary', () => {
    it('maps raw SQL row to TasksSummaryDto', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          today_total: '25',
          pending: '10',
          assigned: '5',
          in_progress: '3',
          completed: '6',
          failed: '0',
          cancelled: '1',
        },
      ]);

      const result = await service.getTasksSummary(TENANT, WH_ID);

      expect(result.todayTotal).toBe(25);
      expect(result.pending).toBe(10);
      expect(result.completed).toBe(6);
    });
  });

  // ── getWarehouseUtilization ───────────────────────────────────────────────────

  describe('getWarehouseUtilization', () => {
    it('computes utilization from raw SQL row', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          total_cells: '500',
          occupied_cells: '350',
          utilization_pct: '70.00',
        },
      ]);

      const result = await service.getWarehouseUtilization(TENANT, WH_ID);

      expect(result.totalCells).toBe(500);
      expect(result.occupiedCells).toBe(350);
      expect(result.utilizationPct).toBe(70);
    });

    it('returns zero utilization when warehouse has no cells', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        { total_cells: '0', occupied_cells: '0', utilization_pct: null },
      ]);

      const result = await service.getWarehouseUtilization(TENANT, WH_ID);
      expect(result.utilizationPct).toBe(0);
    });
  });

  // ── getDashboard ──────────────────────────────────────────────────────────────

  describe('getDashboard', () => {
    it('calls all four sub-queries and returns composite result', async () => {
      const defaultRow = {
        total: '0',
        draft: '0',
        confirmed: '0',
        in_picking: '0',
        picked: '0',
        in_packing: '0',
        packed: '0',
        shipped: '0',
        delivered: '0',
        cancelled: '0',
        returned: '0',
        total_skus: '0',
        total_units: '0',
        low_stock_count: '0',
        out_of_stock_count: '0',
        today_total: '0',
        pending: '0',
        assigned: '0',
        in_progress: '0',
        completed: '0',
        failed: '0',
        total_cells: '0',
        occupied_cells: '0',
        utilization_pct: '0',
      };
      (dataSource.query as jest.Mock).mockResolvedValue([defaultRow]);

      const result = await service.getDashboard(TENANT, WH_ID);

      expect(result.warehouseId).toBe(WH_ID);
      expect(result.generatedAt).toBeDefined();
      expect(result.orders).toBeDefined();
      expect(result.inventory).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(result.utilization).toBeDefined();
      expect(dataSource.query).toHaveBeenCalledTimes(4);
    });
  });

  // ── getEmployeeKpi ────────────────────────────────────────────────────────────

  describe('getEmployeeKpi', () => {
    it('computes accuracy rate from completed + failed counts', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          tasks_completed: '18',
          tasks_failed: '2',
          avg_completion_minutes: '12.5',
          pick_count: '10',
          pack_count: '8',
          receive_count: '0',
          put_away_count: '0',
          transfer_count: '0',
          count_count: '0',
          inspect_count: '0',
          replenish_count: '0',
        },
      ]);

      const result = await service.getEmployeeKpi(TENANT, USER_ID, '2026-03-01T00:00:00Z');

      expect(result.tasksCompleted).toBe(18);
      expect(result.tasksFailed).toBe(2);
      expect(result.accuracyRate).toBe(90); // 18/20 * 100
      expect(result.avgCompletionMinutes).toBe(12.5);
      expect(result.byType.PICK).toBe(10);
      expect(result.byType.PACK).toBe(8);
      // Zero-count types should be stripped
      expect(result.byType.RECEIVE).toBeUndefined();
    });

    it('returns null accuracy and avg when no tasks exist', async () => {
      (dataSource.query as jest.Mock).mockResolvedValueOnce([
        {
          tasks_completed: '0',
          tasks_failed: '0',
          avg_completion_minutes: null,
          pick_count: '0',
          pack_count: '0',
          receive_count: '0',
          put_away_count: '0',
          transfer_count: '0',
          count_count: '0',
          inspect_count: '0',
          replenish_count: '0',
        },
      ]);

      const result = await service.getEmployeeKpi(TENANT, USER_ID, '2026-03-01T00:00:00Z');

      expect(result.accuracyRate).toBeNull();
      expect(result.avgCompletionMinutes).toBeNull();
    });
  });
});
