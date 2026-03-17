import { cn } from '@/shared/lib/cn'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './card'

interface KpiCardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    label?: string
  }
  icon?: React.ReactNode
  accent?: 'none' | 'primary' | 'success' | 'warning' | 'danger'
  className?: string
  loading?: boolean
}

export function KpiCard({ title, value, trend, icon, accent = 'none', className, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="skeleton h-4 w-24 rounded mb-3" />
        <div className="skeleton h-9 w-16 rounded mb-2" />
        <div className="skeleton h-3 w-20 rounded" />
      </Card>
    )
  }

  const trendPositive = trend && trend.value > 0
  const trendNegative = trend && trend.value < 0

  return (
    <Card accent={accent} className={cn('p-5', className)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-neutral-500">{title}</p>
        {icon && <div className="text-neutral-400">{icon}</div>}
      </div>
      <p className="text-4xl font-bold text-neutral-900 mb-1">{value}</p>
      {trend && (
        <div
          className={cn(
            'flex items-center gap-1 text-sm',
            trendPositive && 'text-success-600',
            trendNegative && 'text-danger-600',
            !trendPositive && !trendNegative && 'text-neutral-500'
          )}
        >
          {trendPositive && <TrendingUp className="h-3.5 w-3.5" />}
          {trendNegative && <TrendingDown className="h-3.5 w-3.5" />}
          {!trendPositive && !trendNegative && <Minus className="h-3.5 w-3.5" />}
          <span>
            {trend.value > 0 ? '+' : ''}
            {trend.value}%{trend.label && ` ${trend.label}`}
          </span>
        </div>
      )}
    </Card>
  )
}
