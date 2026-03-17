import { apiClient } from '@/shared/api'
import type {
  DashboardData,
  OrdersSummary,
  InventorySummary,
  TasksSummary,
  WarehouseUtilization,
  EmployeeKpi,
} from '@/entities/analytics/types'

export const analyticsApi = {
  dashboard: async (warehouseId: string): Promise<DashboardData> => {
    const { data } = await apiClient.get<DashboardData>('/analytics/dashboard', {
      params: { warehouseId },
    })
    return data
  },

  orders: async (warehouseId: string): Promise<OrdersSummary> => {
    const { data } = await apiClient.get<OrdersSummary>('/analytics/orders', {
      params: { warehouseId },
    })
    return data
  },

  inventory: async (warehouseId: string): Promise<InventorySummary> => {
    const { data } = await apiClient.get<InventorySummary>('/analytics/inventory', {
      params: { warehouseId },
    })
    return data
  },

  tasks: async (warehouseId: string): Promise<TasksSummary> => {
    const { data } = await apiClient.get<TasksSummary>('/analytics/tasks', {
      params: { warehouseId },
    })
    return data
  },

  utilization: async (warehouseId: string): Promise<WarehouseUtilization> => {
    const { data } = await apiClient.get<WarehouseUtilization>('/analytics/utilization', {
      params: { warehouseId },
    })
    return data
  },

  employeeKpi: async (
    userId: string,
    from: string,
    to?: string
  ): Promise<EmployeeKpi> => {
    const { data } = await apiClient.get<EmployeeKpi>(`/analytics/employees/${userId}/kpi`, {
      params: { from, ...(to && { to }) },
    })
    return data
  },
}
