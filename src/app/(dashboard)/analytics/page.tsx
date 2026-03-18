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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import { formatPercent } from '@/shared/lib/format'
import { TrendingUp, AlertTriangle } from 'lucide-react'

const TASK_COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#94A3B8', '#06B6D4']

export default function AnalyticsPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()

  useEffect(() => {
    if (!selectedWarehouseId && warehouses?.length) {
      setWarehouse(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId, setWarehouse])

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

  const funnelData = orders
    ? [
        { name: 'Создано', value: orders.total, fill: '#60A5FA' },
        { name: 'Подтверждено', value: orders.confirmed + orders.inPicking + orders.picked + orders.inPacking + orders.packed + orders.shipped + orders.delivered, fill: '#3B82F6' },
        { name: 'В обработке', value: orders.inPicking + orders.picked + orders.inPacking + orders.packed, fill: '#2563EB' },
        { name: 'Доставлено', value: orders.delivered, fill: '#1D4ED8' },
      ].filter((d) => d.value > 0)
    : []

  const radarData = tasks
    ? [
        { metric: 'Выполнение', value: tasks.todayTotal > 0 ? Math.round((tasks.completed / tasks.todayTotal) * 100) : 0 },
        { metric: 'Активность', value: tasks.todayTotal > 0 ? Math.round(((tasks.assigned + tasks.inProgress) / tasks.todayTotal) * 100) : 0 },
        { metric: 'Надёжность', value: tasks.todayTotal > 0 ? Math.round(((tasks.todayTotal - tasks.failed) / tasks.todayTotal) * 100) : 0 },
        { metric: 'Загрузка', value: tasks.todayTotal > 0 ? Math.min(100, Math.round((tasks.inProgress / Math.max(tasks.todayTotal, 1)) * 200)) : 0 },
      ]
    : []

  const abcPctC = Math.round(((inventory?.lowStockCount ?? 0) / Math.max(inventory?.totalSkus ?? 1, 1)) * 100)
  const abcPctA = Math.max(5, 100 - abcPctC - 15)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Аналитика</h1>
        {warehouses && warehouses.length > 0 && (
          <Select
            value={selectedWarehouseId ?? ''}
            onChange={(e) => setWarehouse(e.target.value)}
            className="w-52"
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Всего SKU" value={inventory?.totalSkus ?? 0} loading={invLoading}
          icon={<TrendingUp className="h-5 w-5" />} />
        <KpiCard title="Единиц на складе" value={inventory?.totalUnits ?? 0} loading={invLoading} />
        <KpiCard title="Низкий остаток" value={inventory?.lowStockCount ?? 0}
          accent={inventory?.lowStockCount ? 'warning' : 'none'} loading={invLoading}
          icon={inventory?.lowStockCount ? <AlertTriangle className="h-5 w-5 text-warning-500" /> : undefined} />
        <KpiCard title="Заполненность" value={util ? formatPercent(util.utilizationPct) : '—'}
          accent={util && util.utilizationPct > 85 ? 'danger' : util && util.utilizationPct > 70 ? 'warning' : 'none'}
          loading={utilLoading} />
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

      {/* Funnel + Radar */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Воронка заказов</h3></CardHeader>
          <CardContent>
            {ordersLoading ? <Skeleton className="h-48 w-full rounded" /> : funnelData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <FunnelChart>
                  <Tooltip />
                  <Funnel dataKey="value" data={funnelData} isAnimationActive>
                    <LabelList position="right" fill="#64748B" stroke="none" dataKey="name" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-neutral-400 text-center py-12">Нет данных</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Эффективность задач</h3></CardHeader>
          <CardContent>
            {tasksLoading ? <Skeleton className="h-48 w-full rounded" /> : radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={192}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-neutral-400 text-center py-12">Нет данных</p>}
          </CardContent>
        </Card>
      </div>

      {/* Utilization */}
      {util && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Использование ячеек</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs text-neutral-400 mb-1">Всего ячеек</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{util.totalCells}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-1">Занято</p>
                <p className="text-3xl font-bold text-warning-600">{util.occupiedCells}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-400 mb-1">Заполненность</p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">{formatPercent(util.utilizationPct)}</p>
                <div className="mt-2 h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
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

      {/* ABC Analysis */}
      <Card>
        <CardHeader><h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">ABC-анализ запасов</h3></CardHeader>
        <CardContent>
          {invLoading ? <Skeleton className="h-24 w-full rounded" /> : (
            <div className="grid grid-cols-3 gap-6">
              {[
                { label: 'A — Приоритет', desc: 'Высокооборотные товары (top 20% = 80% оборота)', color: 'bg-success-500', pct: abcPctA },
                { label: 'B — Средние', desc: 'Стабильный спрос', color: 'bg-warning-500', pct: 15 },
                { label: 'C — Резерв', desc: 'Низкооборотные / низкий остаток', color: 'bg-danger-400', pct: abcPctC },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{item.label}</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{item.pct}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div className={'h-full rounded-full ' + item.color} style={{ width: item.pct + '%' }} />
                  </div>
                  <p className="text-xs text-neutral-400">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
