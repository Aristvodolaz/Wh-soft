'use client'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { useDashboard } from '@/features/analytics/api/use-analytics'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { KpiSection } from '@/widgets/dashboard/kpi-section'
import { OrdersChart } from '@/widgets/dashboard/orders-chart'
import { ActiveTasksPanel } from '@/widgets/dashboard/active-tasks-panel'
import { Select } from '@/shared/ui/select'
import { formatDate } from '@/shared/lib/format'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()

  // Auto-select first warehouse if none selected
  useEffect(() => {
    if (!selectedWarehouseId && warehouses?.length) {
      setWarehouse(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId, setWarehouse])

  const warehouseId = selectedWarehouseId ?? ''
  const { data: dashboard, isLoading } = useDashboard(warehouseId)

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Доброе утро' : now.getHours() < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{greeting}!</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{formatDate(now, 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex items-center gap-3">
          {warehouses && warehouses.length > 0 && (
            <Select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-52"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <KpiSection data={dashboard} loading={isLoading} />

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <OrdersChart data={dashboard?.orders} loading={isLoading} />
        </div>
        <div className="col-span-1">
          <ActiveTasksPanel />
        </div>
      </div>
    </div>
  )
}
