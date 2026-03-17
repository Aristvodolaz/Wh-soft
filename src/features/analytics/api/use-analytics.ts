import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from './analytics-api'

export const analyticsKeys = {
  dashboard: (warehouseId: string) => ['analytics', 'dashboard', warehouseId] as const,
  orders: (warehouseId: string) => ['analytics', 'orders', warehouseId] as const,
  inventory: (warehouseId: string) => ['analytics', 'inventory', warehouseId] as const,
  tasks: (warehouseId: string) => ['analytics', 'tasks', warehouseId] as const,
  utilization: (warehouseId: string) => ['analytics', 'utilization', warehouseId] as const,
  employeeKpi: (userId: string, from: string, to?: string) =>
    ['analytics', 'employee', userId, from, to] as const,
}

export function useDashboard(warehouseId: string) {
  return useQuery({
    queryKey: analyticsKeys.dashboard(warehouseId),
    queryFn: () => analyticsApi.dashboard(warehouseId),
    enabled: !!warehouseId,
    refetchInterval: 30_000, // Auto-refresh every 30s
  })
}

export function useOrdersAnalytics(warehouseId: string) {
  return useQuery({
    queryKey: analyticsKeys.orders(warehouseId),
    queryFn: () => analyticsApi.orders(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useInventoryAnalytics(warehouseId: string) {
  return useQuery({
    queryKey: analyticsKeys.inventory(warehouseId),
    queryFn: () => analyticsApi.inventory(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useTasksAnalytics(warehouseId: string) {
  return useQuery({
    queryKey: analyticsKeys.tasks(warehouseId),
    queryFn: () => analyticsApi.tasks(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useUtilization(warehouseId: string) {
  return useQuery({
    queryKey: analyticsKeys.utilization(warehouseId),
    queryFn: () => analyticsApi.utilization(warehouseId),
    enabled: !!warehouseId,
  })
}

export function useEmployeeKpi(userId: string, from: string, to?: string) {
  return useQuery({
    queryKey: analyticsKeys.employeeKpi(userId, from, to),
    queryFn: () => analyticsApi.employeeKpi(userId, from, to),
    enabled: !!userId && !!from,
  })
}
