'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useOrdersAnalytics, useInventoryAnalytics, useTasksAnalytics, useUtilization } from '@/features/analytics/api/use-analytics'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { KpiCard } from '@/shared/ui/kpi-card'
import { Select } from '@/shared/ui/select'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatPercent } from '@/shared/lib/format'

const TASK_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#94A3B8', '#06B6D4']

export default function AnalyticsPage() {
  const { data: warehouses } = useWarehouses()
  const warehouseList = Array.isArray(warehouses) ? warehouses : []
  const { selectedWarehouseId, setWarehouse } = useAuthStore()

  useEffect(() => {
    if (!selectedWarehouseId && warehouseList.length) {
      setWarehouse(warehouseList[0].id)
    }
  }, [warehouseList, selectedWarehouseId, setWarehouse])

  const warehouseId = selectedWarehouseId ?? ''
  const { data: orders, isLoading: ordersLoading } = useOrdersAnalytics(warehouseId)
  const { data: inventory, isLoading: invLoading } = useInventoryAnalytics(warehouseId)
  const { data: tasks, isLoading: tasksLoading } = useTasksAnalytics(warehouseId)
  const { data: util, isLoading: utilLoading } = useUtilization(warehouseId)

  const orderStatusData = orders
    ? [
        { name: 'Черновик', value: orders.draft },
        { name: 'Подтверждён', value: orders.confirmed },
        { name: 'В сборке', value: orders.inPicking },
        { name: 'Собран', value: orders.picked },
        { name: 'В упаковке', value: orders.inPacking },
        { name: 'Отгружен', value: orders.shipped },
        { name: 'Доставлен', value: orders.delivered },
        { name: 'Отменён', value: orders.cancelled },
      ].filter((d) => d.value > 0)
    : []

  const taskStatusData = tasks
    ? [
        { name: 'Ожидает', value: tasks.pending },
        { name: 'Назначена', value: tasks.assigned },
        { name: 'В работе', value: tasks.inProgress },
        { name: 'Выполнена', value: tasks.completed },
        { name: 'Провалена', value: tasks.failed },
        { name: 'Отменена', value: tasks.cancelled },
      ].filter((d) => d.value > 0)
    : []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">Аналитика</h1>
        {warehouseList.length > 0 && (
          <Select
            value={selectedWarehouseId ?? ''}
            onChange={(e) => setWarehouse(e.target.value)}
            className="w-52"
          >
            {warehouseList.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          title="Всего SKU"
          value={inventory?.totalSkus ?? 0}
          loading={invLoading}
        />
        <KpiCard
          title="Единиц на складе"
          value={inventory?.totalUnits ?? 0}
          loading={invLoading}
        />
        <KpiCard
          title="Низкий остаток"
          value={inventory?.lowStockCount ?? 0}
          accent={inventory?.lowStockCount ? 'warning' : 'none'}
          loading={invLoading}
        />
        <KpiCard
          title="Заполненность"
          value={util ? formatPercent(util.utilizationPct) : '—'}
          accent={util && util.utilizationPct > 85 ? 'danger' : 'none'}
          loading={utilLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900">Заказы по статусам</h3>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <Skeleton className="h-56 w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={orderStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900">Задачи сегодня</h3>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-56 w-full rounded" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <PieChart>
                  <Pie
                    data={taskStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {taskStatusData.map((_, i) => (
                      <Cell key={i} fill={TASK_COLORS[i % TASK_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Utilization */}
      {util && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900">Использование ячеек</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs text-neutral-400 mb-1">Всего ячеек</p>
                <p className="text-3xl font-bold text-neutral-900">{util.totalCells}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-1">Занято</p>
                <p className="text-3xl font-bold text-warning-600">{util.occupiedCells}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-1">Заполненность</p>
                <p className="text-3xl font-bold text-neutral-900">{formatPercent(util.utilizationPct)}</p>
                <div className="mt-2 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${util.utilizationPct}%`,
                      backgroundColor: util.utilizationPct > 85 ? '#EF4444' : util.utilizationPct > 70 ? '#F59E0B' : '#22C55E',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
