'use client'

import { KpiCard } from '@/shared/ui/kpi-card'
import { Package, ShoppingCart, ClipboardList, Warehouse } from 'lucide-react'
import type { DashboardData } from '@/entities/analytics/types'

interface KpiSectionProps {
  data?: DashboardData
  loading?: boolean
}

export function KpiSection({ data, loading }: KpiSectionProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        title="Заказов сегодня"
        value={data?.orders.total ?? 0}
        accent="primary"
        icon={<ShoppingCart className="h-5 w-5" />}
        loading={loading}
      />
      <KpiCard
        title="Активных приёмок"
        value={data?.orders.inPicking ?? 0}
        accent="warning"
        icon={<Package className="h-5 w-5" />}
        loading={loading}
      />
      <KpiCard
        title="Открытых задач"
        value={(data?.tasks.pending ?? 0) + (data?.tasks.assigned ?? 0) + (data?.tasks.inProgress ?? 0)}
        accent="success"
        icon={<ClipboardList className="h-5 w-5" />}
        loading={loading}
      />
      <KpiCard
        title="Заполненность склада"
        value={data ? `${data.utilization.utilizationPct.toFixed(0)}%` : '—'}
        accent={
          (data?.utilization.utilizationPct ?? 0) > 90
            ? 'danger'
            : (data?.utilization.utilizationPct ?? 0) > 70
            ? 'warning'
            : 'none'
        }
        icon={<Warehouse className="h-5 w-5" />}
        loading={loading}
      />
    </div>
  )
}
