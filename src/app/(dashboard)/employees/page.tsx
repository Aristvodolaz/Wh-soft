'use client'

import { useState } from 'react'
import { useEmployeeKpi } from '@/features/analytics/api/use-analytics'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { KpiCard } from '@/shared/ui/kpi-card'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Users, Search, CheckCircle, XCircle, Clock, Target } from 'lucide-react'
import { formatDate } from '@/shared/lib/format'

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) { return [d.getFullYear(), pad2(d.getMonth()+1), pad2(d.getDate())].join('-') }

export default function EmployeesPage() {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(today.getDate() - 30)

  const [userId, setUserId] = useState('')
  const [submittedId, setSubmittedId] = useState('')
  const [from, setFrom] = useState(toDateStr(monthAgo))
  const [to, setTo] = useState(toDateStr(today))

  const { data: kpi, isLoading, isError } = useEmployeeKpi(submittedId, from, to || undefined)

  const onSearch = () => { if (!userId.trim()) return; setSubmittedId(userId.trim()) }

  const byTypeData = kpi?.byType.map((t) => ({
    name: t.type,
    Выполнено: t.completed,
    Провалено: t.failed,
  })) ?? []

  const accuracyPct = kpi?.accuracyRate != null ? (kpi.accuracyRate * 100).toFixed(1) + '%' : '—'
  const avgMin = kpi?.avgCompletionMinutes != null ? Math.round(kpi.avgCompletionMinutes) + ' мин' : '—'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary-500" />
          Сотрудники / KPI
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">Ключевые показатели эффективности</p>
      </div>

      <Card className="p-5">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input label="UUID сотрудника" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={userId} onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()} />
          </div>
          <div className="w-40">
            <Input label="От" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-40">
            <Input label="До" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={onSearch} disabled={!userId.trim()}>
            <Search className="h-4 w-4" /> Найти
          </Button>
        </div>
      </Card>

      {!submittedId ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="Введите ID сотрудника"
          description="Введите UUID сотрудника для просмотра его KPI за выбранный период" />
      ) : isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24 rounded mb-3" />
              <Skeleton className="h-9 w-16 rounded" />
            </Card>
          ))}
        </div>
      ) : isError || !kpi ? (
        <EmptyState title="Сотрудник не найден" description="Проверьте UUID сотрудника" />
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-neutral-500">
            Период: <span className="font-medium text-neutral-700">{formatDate(kpi.from)} — {formatDate(kpi.to)}</span>
          </p>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard title="Задач выполнено" value={kpi.tasksCompleted} icon={<CheckCircle className="h-5 w-5 text-success-500" />} accent="success" />
            <KpiCard title="Задач провалено" value={kpi.tasksFailed} icon={<XCircle className="h-5 w-5 text-danger-500" />} accent={kpi.tasksFailed > 0 ? 'danger' : 'none'} />
            <KpiCard title="Точность" value={accuracyPct} icon={<Target className="h-5 w-5 text-primary-500" />}
              accent={kpi.accuracyRate != null && kpi.accuracyRate >= 0.9 ? 'success' : kpi.accuracyRate != null && kpi.accuracyRate < 0.7 ? 'danger' : 'none'} />
            <KpiCard title="Сред. время задачи" value={avgMin} icon={<Clock className="h-5 w-5 text-neutral-400" />} />
          </div>
          {byTypeData.length > 0 && (
            <Card>
              <CardHeader><h3 className="text-lg font-semibold text-neutral-900">Задачи по типу</h3></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Выполнено" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Провалено" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
