export interface OrdersSummary {
  total: number
  draft: number
  confirmed: number
  inPicking: number
  picked: number
  inPacking: number
  packed: number
  shipped: number
  delivered: number
  cancelled: number
  returned: number
}

export interface InventorySummary {
  totalSkus: number
  totalUnits: number
  lowStockCount: number
  outOfStockCount: number
}

export interface TasksSummary {
  todayTotal: number
  pending: number
  assigned: number
  inProgress: number
  completed: number
  failed: number
  cancelled: number
}

export interface WarehouseUtilization {
  totalCells: number
  occupiedCells: number
  utilizationPct: number
}

export interface DashboardData {
  warehouseId: string
  generatedAt: string
  orders: OrdersSummary
  inventory: InventorySummary
  tasks: TasksSummary
  utilization: WarehouseUtilization
}

export interface TaskTypeBreakdown {
  type: string
  completed: number
  failed: number
}

export interface EmployeeKpi {
  userId: string
  from: string
  to: string
  tasksCompleted: number
  tasksFailed: number
  avgCompletionMinutes: number | null
  accuracyRate: number | null
  byType: TaskTypeBreakdown[]
}
