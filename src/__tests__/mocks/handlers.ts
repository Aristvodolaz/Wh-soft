import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost:3030'

// ── Fixtures ──────────────────────────────────────────────────────────────────

export const mockWarehouse = {
  id: 'wh-1',
  tenantId: 'tenant-1',
  name: 'Склад 1',
  code: 'WH-01',
  city: 'Москва',
  country: 'Россия',
  timezone: 'Europe/Moscow',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

export const mockZone = {
  id: 'zone-1',
  tenantId: 'tenant-1',
  warehouseId: 'wh-1',
  name: 'Зона A',
  code: 'ZONE-A',
  type: 'STORAGE',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

export const mockCell = {
  id: 'cell-1',
  tenantId: 'tenant-1',
  warehouseId: 'wh-1',
  zoneId: 'zone-1',
  code: 'A-01-01-01',
  barcode: '200012345678',
  isActive: true,
  isOccupied: false,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

export const mockKpi = {
  userId: 'user-uuid-1',
  from: '2026-02-15T00:00:00Z',
  to: '2026-03-17T00:00:00Z',
  tasksCompleted: 42,
  tasksFailed: 3,
  avgCompletionMinutes: 18.5,
  accuracyRate: 0.933,
  byType: [
    { type: 'PICK', completed: 20, failed: 1 },
    { type: 'PACK', completed: 15, failed: 2 },
    { type: 'RECEIVE', completed: 7, failed: 0 },
  ],
}

export const mockTask = {
  id: 'task-1',
  tenantId: 'tenant-1',
  warehouseId: 'wh-1',
  type: 'PICK',
  status: 'ASSIGNED',
  priority: 'NORMAL',
  title: 'Собрать заказ #123',
  assignedTo: 'user-uuid-1',
  assignedAt: '2026-03-01T10:00:00Z',
  createdAt: '2026-03-01T09:00:00Z',
  updatedAt: '2026-03-01T10:00:00Z',
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE}/auth/login`, () =>
    HttpResponse.json({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      role: 'WAREHOUSE_ADMIN',
      expiresIn: 3600,
    }),
  ),

  // Warehouses
  http.get(`${BASE}/warehouses`, () =>
    HttpResponse.json([mockWarehouse]),
  ),
  http.get(`${BASE}/warehouses/:id`, () =>
    HttpResponse.json(mockWarehouse),
  ),
  http.get(`${BASE}/warehouses/:id/zones`, () =>
    HttpResponse.json([mockZone]),
  ),
  http.get(`${BASE}/warehouses/:warehouseId/zones/:zoneId/cells`, () =>
    HttpResponse.json([mockCell]),
  ),
  http.post(`${BASE}/warehouses/:warehouseId/cells/bulk`, () =>
    HttpResponse.json({ created: 1, cells: [mockCell] }),
  ),

  // Tasks
  http.get(`${BASE}/tasks`, () =>
    HttpResponse.json([mockTask]),
  ),
  http.get(`${BASE}/tasks/my`, () =>
    HttpResponse.json([mockTask]),
  ),

  // Analytics
  http.get(`${BASE}/analytics/employees/:userId/kpi`, () =>
    HttpResponse.json(mockKpi),
  ),
  http.get(`${BASE}/analytics/dashboard`, () =>
    HttpResponse.json({
      warehouseId: 'wh-1',
      generatedAt: '2026-03-17T00:00:00Z',
      orders: { total: 100, draft: 10, confirmed: 20, inPicking: 5, picked: 5, inPacking: 5, packed: 5, shipped: 30, delivered: 15, cancelled: 5, returned: 0 },
      inventory: { totalSkus: 500, totalUnits: 12000, lowStockCount: 8, outOfStockCount: 2 },
      tasks: { todayTotal: 30, pending: 5, assigned: 8, inProgress: 3, completed: 12, failed: 1, cancelled: 1 },
      utilization: { totalCells: 240, occupiedCells: 180, utilizationPct: 75 },
    }),
  ),
]
