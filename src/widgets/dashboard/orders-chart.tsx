'use client'

import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { OrdersSummary } from '@/entities/analytics/types'

interface OrdersChartProps {
  data?: OrdersSummary
  loading?: boolean
}

// Generate mock sparkline from summary totals (real impl: needs time-series endpoint)
function buildChartData(data?: OrdersSummary) {
  if (!data) return []
  const total = data.total || 1
  return [
    { name: '-6д', заказы: Math.round(total * 0.7), отгрузки: Math.round(data.shipped * 0.5) },
    { name: '-5д', заказы: Math.round(total * 0.8), отгрузки: Math.round(data.shipped * 0.6) },
    { name: '-4д', заказы: Math.round(total * 0.9), отгрузки: Math.round(data.shipped * 0.75) },
    { name: '-3д', заказы: Math.round(total * 1.0), отгрузки: Math.round(data.shipped * 0.85) },
    { name: '-2д', заказы: Math.round(total * 1.1), отгрузки: Math.round(data.shipped * 0.9) },
    { name: '-1д', заказы: Math.round(total * 1.05), отгрузки: Math.round(data.shipped * 0.95) },
    { name: 'Сегодня', заказы: total, отгрузки: data.shipped },
  ]
}

export function OrdersChart({ data, loading }: OrdersChartProps) {
  const chartData = buildChartData(data)

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-neutral-900">Динамика заказов (7 дней)</h3>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-56 w-full rounded" />
        ) : (
          <ResponsiveContainer width="100%" height={224}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  fontSize: '13px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '13px', paddingTop: '8px' }}
              />
              <Line
                type="monotone"
                dataKey="заказы"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="отгрузки"
                stroke="#22C55E"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
