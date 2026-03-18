'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEmployeeStore, type EmployeeProfile } from '@/features/employees/store/employee-store'
import { useEmployeeKpi } from '@/features/analytics/api/use-analytics'
import { useTasks, useAssignTask } from '@/features/tasks/api/use-tasks'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { KpiCard } from '@/shared/ui/kpi-card'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Modal } from '@/shared/ui/modal'
import { Skeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table } from '@/shared/ui/table'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, Search, CheckCircle, XCircle, Clock, Target,
  Plus, Pencil, Trash2, BarChart2, ListTodo, UserCircle,
  Filter, X, Zap, ClipboardList, Shuffle, Copy, Check,
} from 'lucide-react'
import { formatDate } from '@/shared/lib/format'
import type { EmployeeKpi } from '@/entities/analytics/types'

// Backend returns byType as { PICK: n, ... }; MSW may return [{ type, completed, failed }]
function kpiByTypeToRows(byType: EmployeeKpi['byType'] | undefined) {
  if (!byType) return [] as { type: string; completed: number; failed: number }[]
  if (Array.isArray(byType)) {
    return byType.map((t) => ({
      type: t.type,
      completed: t.completed,
      failed: t.failed,
    }))
  }
  return Object.entries(byType).map(([type, completed]) => ({
    type,
    completed: Number(completed) || 0,
    failed: 0,
  }))
}
import { Role } from '@/entities/auth/types'
import { TaskStatus } from '@/entities/task/types'
import type { Task } from '@/entities/task/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'

// ─── helpers ─────────────────────────────────────────────────────────────────

function pad2(n: number) { return String(n).padStart(2, '0') }
function toDateStr(d: Date) {
  return [d.getFullYear(), pad2(d.getMonth() + 1), pad2(d.getDate())].join('-')
}

const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Супер-Админ',
  [Role.WAREHOUSE_ADMIN]: 'Адм. склада',
  [Role.MANAGER]: 'Менеджер',
  [Role.WORKER]: 'Рабочий',
  [Role.ANALYST]: 'Аналитик',
}

const ROLE_BADGE: Record<Role, 'active' | 'pending' | 'in-progress' | 'default'> = {
  [Role.SUPER_ADMIN]: 'active',
  [Role.WAREHOUSE_ADMIN]: 'active',
  [Role.MANAGER]: 'in-progress',
  [Role.WORKER]: 'pending',
  [Role.ANALYST]: 'default',
}

const TASK_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Ожидает',
  ASSIGNED: 'Назначена',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнена',
  FAILED: 'Провалена',
  CANCELLED: 'Отменена',
}

const TASK_STATUS_BADGE: Record<string, 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled' | 'default'> = {
  PENDING: 'pending',
  ASSIGNED: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
}

// ─── Form schema ──────────────────────────────────────────────────────────────

const employeeSchema = z.object({
  id: z.string().uuid('Введите корректный UUID'),
  firstName: z.string().min(1, 'Обязательное поле'),
  lastName: z.string().min(1, 'Обязательное поле'),
  email: z.string().email('Введите email'),
  role: z.nativeEnum(Role),
  phone: z.string().optional(),
  hiredAt: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
})
type EmployeeForm = z.infer<typeof employeeSchema>

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmployeeFormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: EmployeeProfile
  onSave: (data: EmployeeForm) => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initial
      ? { ...initial }
      : { role: Role.WORKER, isActive: true },
  })

  const handleGenerateUuid = useCallback(() => {
    const newId = crypto.randomUUID()
    form.setValue('id', newId, { shouldValidate: true })
  }, [form])

  const handleCopyUuid = useCallback(() => {
    const id = form.getValues('id')
    if (!id) return
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [form])

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? 'Редактировать сотрудника' : 'Новый сотрудник'}
      size="lg"
    >
      <form onSubmit={form.handleSubmit(onSave)} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Имя"
            required
            error={form.formState.errors.firstName?.message}
            {...form.register('firstName')}
          />
          <Input
            label="Фамилия"
            required
            error={form.formState.errors.lastName?.message}
            {...form.register('lastName')}
          />
        </div>

        {/* UUID field with generate / copy actions */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            UUID сотрудника <span className="text-danger-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              className={[
                'flex-1 h-9 px-3 text-sm rounded-lg border bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
                'placeholder:text-neutral-400 font-mono',
                initial
                  ? 'bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed text-neutral-500'
                  : '',
                form.formState.errors.id
                  ? 'border-danger-400'
                  : 'border-neutral-200 dark:border-neutral-700',
              ].join(' ')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={!!initial}
              {...form.register('id')}
            />
            {!initial && (
              <button
                type="button"
                onClick={handleGenerateUuid}
                title="Сгенерировать UUID"
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
              >
                <Shuffle className="h-3.5 w-3.5 text-primary-500" />
                Сгенерировать
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyUuid}
              title="Скопировать UUID"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {copied
                ? <Check className="h-3.5 w-3.5 text-success-500" />
                : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
            </button>
          </div>
          {form.formState.errors.id && (
            <p className="text-xs text-danger-500">{form.formState.errors.id.message}</p>
          )}
          <p className="text-xs text-neutral-400">
            Должен совпадать с ID пользователя в системе, или сгенерируйте новый
          </p>
        </div>
        <Input
          label="Email"
          type="email"
          required
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Роль" {...form.register('role')}>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
          <Input label="Телефон" placeholder="+7 (999) 000-00-00" {...form.register('phone')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Дата приёма" type="date" {...form.register('hiredAt')} />
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 rounded border-neutral-300 text-primary-600"
              {...form.register('isActive')}
            />
            <label htmlFor="isActive" className="text-sm text-neutral-700">Активен</label>
          </div>
        </div>
        <Input
          label="Заметки"
          placeholder="Любая дополнительная информация..."
          {...form.register('notes')}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit">{initial ? 'Сохранить' : 'Добавить'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── KPI Panel ────────────────────────────────────────────────────────────────

function EmployeeKpiPanel({ employeeId }: { employeeId: string }) {
  const today = new Date()
  const monthAgo = new Date(today)
  monthAgo.setDate(today.getDate() - 30)

  const [from, setFrom] = useState(toDateStr(monthAgo))
  const [to, setTo] = useState(toDateStr(today))
  const [submitted, setSubmitted] = useState({ from: toDateStr(monthAgo), to: toDateStr(today) })

  const { data: kpi, isLoading } = useEmployeeKpi(employeeId, submitted.from, submitted.to)

  const byTypeData = kpiByTypeToRows(kpi?.byType).map((t) => ({
    name: t.type,
    Выполнено: t.completed,
    Провалено: t.failed,
  }))

  // API: 0–100; mocks may use 0–1 ratio
  const accuracyPct =
    kpi?.accuracyRate != null
      ? `${(kpi.accuracyRate > 1 ? kpi.accuracyRate : kpi.accuracyRate * 100).toFixed(1)}%`
      : '—'
  const accuracyRatio =
    kpi?.accuracyRate != null
      ? kpi.accuracyRate > 1
        ? kpi.accuracyRate / 100
        : kpi.accuracyRate
      : null
  const avgMin = kpi?.avgCompletionMinutes != null
    ? Math.round(kpi.avgCompletionMinutes) + ' мин'
    : '—'

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="w-40">
          <Input label="От" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <Input label="До" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" onClick={() => setSubmitted({ from, to })}>
          <Search className="h-4 w-4" /> Обновить
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-4 w-24 rounded mb-3" />
              <Skeleton className="h-9 w-16 rounded" />
            </Card>
          ))}
        </div>
      ) : !kpi ? (
        <EmptyState
          icon={<BarChart2 className="h-10 w-10" />}
          title="Нет данных KPI"
          description="За выбранный период задачи не найдены"
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Период:{' '}
            <span className="font-medium text-neutral-700">
              {formatDate(kpi.from)} — {formatDate(kpi.to)}
            </span>
          </p>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard
              title="Выполнено задач"
              value={kpi.tasksCompleted}
              icon={<CheckCircle className="h-5 w-5 text-success-500" />}
              accent="success"
            />
            <KpiCard
              title="Провалено задач"
              value={kpi.tasksFailed}
              icon={<XCircle className="h-5 w-5 text-danger-500" />}
              accent={kpi.tasksFailed > 0 ? 'danger' : 'none'}
            />
            <KpiCard
              title="Точность"
              value={accuracyPct}
              icon={<Target className="h-5 w-5 text-primary-500" />}
              accent={
                accuracyRatio != null && accuracyRatio >= 0.9
                  ? 'success'
                  : accuracyRatio != null && accuracyRatio < 0.7
                  ? 'danger'
                  : 'none'
              }
            />
            <KpiCard
              title="Сред. время задачи"
              value={avgMin}
              icon={<Clock className="h-5 w-5 text-neutral-400" />}
            />
          </div>
          {byTypeData.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Задачи по типу
                </h3>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
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

// ─── Tasks Panel ──────────────────────────────────────────────────────────────

function EmployeeTasksPanel({ employeeId }: { employeeId: string }) {
  const { data: tasks, isLoading } = useTasks()

  const myTasks = tasks?.filter((t) => t.assignedTo === employeeId) ?? []

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded" />
        ))}
      </div>
    )
  }

  if (!myTasks.length) {
    return (
      <EmptyState
        icon={<ListTodo className="h-10 w-10" />}
        title="Задач нет"
        description="Этому сотруднику задачи не назначены"
      />
    )
  }

  return (
    <Table
      columns={[
        { key: 'title', header: 'Название' },
        {
          key: 'type',
          header: 'Тип',
          render: (r) => <span className="font-mono text-xs">{r.type}</span>,
        },
        {
          key: 'status',
          header: 'Статус',
          render: (r) => (
            <Badge variant={TASK_STATUS_BADGE[r.status] ?? 'default'} dot={false}>
              {TASK_STATUS_LABEL[r.status] ?? r.status}
            </Badge>
          ),
        },
        {
          key: 'priority',
          header: 'Приоритет',
          render: (r) => (
            <span className="text-sm">{r.priority}</span>
          ),
        },
        {
          key: 'dueAt',
          header: 'Срок',
          render: (r) => r.dueAt ? formatDate(r.dueAt) : '—',
        },
      ]}
      data={myTasks}
      keyExtractor={(r) => r.id}
    />
  )
}

// ─── Quick Assign Modal ───────────────────────────────────────────────────────

function QuickAssignModal({
  employee,
  onClose,
}: {
  employee: EmployeeProfile
  onClose: () => void
}) {
  const { data: tasks, isLoading } = useTasks()
  const assignTask = useAssignTask()
  const [assigneeUuid, setAssigneeUuid] = useState(employee.id)
  useEffect(() => setAssigneeUuid(employee.id), [employee.id])

  const pending = (tasks ?? []).filter(
    (t) => t.status === TaskStatus.PENDING && !t.assignedTo,
  )

  const handleAssign = async (task: Task) => {
    const parsed = z.string().uuid().safeParse(assigneeUuid.trim())
    if (!parsed.success) {
      toast.error('Введите корректный UUID пользователя (users.id — учётная запись WMS).')
      return
    }
    try {
      await assignTask.mutateAsync({ taskId: task.id, userId: parsed.data })
      onClose()
    } catch {
      // toast в useAssignTask
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Назначить задачу — ${employee.firstName} ${employee.lastName}`}
      size="lg"
    >
      <div className="p-6 space-y-4">
        <Input
          label="UUID исполнителя (users.id)"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="font-mono text-sm"
          value={assigneeUuid}
          onChange={(e) => setAssigneeUuid(e.target.value)}
        />
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Можно вставить любой UUID из БД <code className="font-mono">users</code>. ID из карточки
          сотрудника подставлен по умолчанию — замените при необходимости.
        </p>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded" />
            ))}
          </div>
        ) : !pending.length ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Нет доступных задач"
            description="Все задачи уже назначены или выполнены"
          />
        ) : (
          <Table
            columns={[
              { key: 'title', header: 'Задача' },
              {
                key: 'type',
                header: 'Тип',
                render: (t) => <span className="font-mono text-xs">{t.type}</span>,
              },
              {
                key: 'priority',
                header: 'Приоритет',
                render: (t) => <span className="text-sm">{t.priority}</span>,
              },
              {
                key: 'actions',
                header: '',
                render: (t) => (
                  <Button
                    size="xs"
                    onClick={() => handleAssign(t)}
                    disabled={assignTask.isPending}
                  >
                    <Zap className="h-3 w-3" /> Назначить
                  </Button>
                ),
              },
            ]}
            data={pending}
            keyExtractor={(t) => t.id}
          />
        )}
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </Modal>
  )
}

/** Назначение без выбора сотрудника — только задача + UUID пользователя */
function AssignTaskByUuidModal({ onClose }: { onClose: () => void }) {
  const { data: tasks, isLoading } = useTasks()
  const assignTask = useAssignTask()
  const pending = (tasks ?? []).filter(
    (t) => t.status === TaskStatus.PENDING && !t.assignedTo,
  )
  const [taskId, setTaskId] = useState('')
  const [userUuid, setUserUuid] = useState('')
  useEffect(() => {
    if (pending.length && !taskId) setTaskId(pending[0].id)
  }, [pending, taskId])

  const handleSubmit = async () => {
    const u = z.string().uuid().safeParse(userUuid.trim())
    if (!u.success) {
      toast.error('Введите корректный UUID пользователя (users.id).')
      return
    }
    if (!taskId) {
      toast.error('Выберите задачу.')
      return
    }
    try {
      await assignTask.mutateAsync({ taskId, userId: u.data })
      onClose()
    } catch {
      /* toast в useAssignTask */
    }
  }

  return (
    <Modal open onClose={onClose} title="Назначить задачу по UUID" size="lg">
      <div className="p-6 space-y-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Укажите задачу в статусе «Ожидает» и UUID зарегистрированного пользователя.
        </p>
        {isLoading ? (
          <Skeleton className="h-10 w-full rounded" />
        ) : !pending.length ? (
          <EmptyState
            icon={<ClipboardList className="h-10 w-10" />}
            title="Нет задач в очереди"
            description="Создайте задачу или дождитесь статуса «Ожидает»"
          />
        ) : (
          <>
            <Select label="Задача" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
              {pending.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} · {t.type}
                </option>
              ))}
            </Select>
            <Input
              label="UUID пользователя (users.id)"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="font-mono text-sm"
              value={userUuid}
              onChange={(e) => setUserUuid(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Отмена
              </Button>
              <Button type="button" loading={assignTask.isPending} onClick={handleSubmit}>
                <Zap className="h-4 w-4" /> Назначить
              </Button>
            </div>
          </>
        )}
        {!pending.length && !isLoading && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onClose}>
              Закрыть
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Employee Detail Drawer ───────────────────────────────────────────────────

type DetailTab = 'kpi' | 'tasks' | 'profile'

function EmployeeDetail({
  employee,
  onEdit,
  onAssign,
  onClose,
}: {
  employee: EmployeeProfile
  onEdit: () => void
  onAssign: () => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<DetailTab>('kpi')

  const tabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: 'kpi', label: 'KPI', icon: <BarChart2 className="h-4 w-4" /> },
    { key: 'tasks', label: 'Задачи', icon: <ListTodo className="h-4 w-4" /> },
    { key: 'profile', label: 'Профиль', icon: <UserCircle className="h-4 w-4" /> },
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={`${employee.firstName} ${employee.lastName}`}
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Header info */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-sm">
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div>
              <p className="text-sm text-neutral-500">{employee.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={ROLE_BADGE[employee.role]} dot={false}>
                  {ROLE_LABELS[employee.role]}
                </Badge>
                {!employee.isActive && (
                  <Badge variant="cancelled" dot={false}>Неактивен</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onAssign}>
              <Zap className="h-3 w-3" /> Задачу
            </Button>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="h-3 w-3" /> Редактировать
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {tab === 'kpi' && <EmployeeKpiPanel employeeId={employee.id} />}
          {tab === 'tasks' && <EmployeeTasksPanel employeeId={employee.id} />}
          {tab === 'profile' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['UUID', employee.id],
                ['Имя', employee.firstName + ' ' + employee.lastName],
                ['Email', employee.email],
                ['Роль', ROLE_LABELS[employee.role]],
                ['Телефон', employee.phone ?? '—'],
                ['Дата приёма', employee.hiredAt ? formatDate(employee.hiredAt) : '—'],
                ['Статус', employee.isActive ? 'Активен' : 'Неактивен'],
                ['Добавлен', formatDate(employee.createdAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-neutral-400 mb-0.5">{label}</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 break-all">{value}</p>
                </div>
              ))}
              {employee.notes && (
                <div className="col-span-2">
                  <p className="text-neutral-400 mb-0.5">Заметки</p>
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">{employee.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { employees, addEmployee, updateEmployee, removeEmployee } = useEmployeeStore()
  const { data: tasks } = useTasks()

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeProfile | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<EmployeeProfile | null>(null)
  const [assignEmployee, setAssignEmployee] = useState<EmployeeProfile | null>(null)
  const [uuidAssignOpen, setUuidAssignOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<EmployeeProfile | null>(null)

  // URL-driven filters
  const roleFilter = searchParams.get('role') as Role | null
  const statusFilter = searchParams.get('status') as 'active' | 'inactive' | null

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/employees?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const clearFilters = () => router.replace('/employees', { scroll: false })
  const hasFilters = roleFilter || statusFilter

  // Workload: active task count per employee
  const workloadMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of tasks ?? []) {
      if (t.assignedTo && (t.status === TaskStatus.ASSIGNED || t.status === TaskStatus.IN_PROGRESS)) {
        map[t.assignedTo] = (map[t.assignedTo] ?? 0) + 1
      }
    }
    return map
  }, [tasks])

  const filtered = employees.filter((e) => {
    const q = search.toLowerCase()
    const matchQ =
      !q ||
      e.firstName.toLowerCase().includes(q) ||
      e.lastName.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
    const matchRole = !roleFilter || e.role === roleFilter
    const matchStatus =
      !statusFilter ||
      (statusFilter === 'active' ? e.isActive : !e.isActive)
    return matchQ && matchRole && matchStatus
  })

  const handleAdd = (data: EmployeeForm) => {
    addEmployee({ ...data, isActive: data.isActive ?? true })
    setShowAdd(false)
  }

  const handleEdit = (data: EmployeeForm) => {
    if (!editEmployee) return
    updateEmployee(editEmployee.id, data)
    setEditEmployee(null)
    if (detailEmployee?.id === editEmployee.id) {
      setDetailEmployee({ ...detailEmployee, ...data })
    }
  }

  const handleDelete = () => {
    if (!deleteConfirm) return
    removeEmployee(deleteConfirm.id)
    setDeleteConfirm(null)
    if (detailEmployee?.id === deleteConfirm.id) setDetailEmployee(null)
  }

  const activeCount = employees.filter((e) => e.isActive).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-500" />
            Сотрудники
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filtered.length} из {employees.length} сотрудников
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setUuidAssignOpen(true)}>
            <Zap className="h-4 w-4" /> Назначить по UUID
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Добавить сотрудника
          </Button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard
          title="Всего сотрудников"
          value={employees.length}
          icon={<Users className="h-5 w-5 text-primary-500" />}
        />
        <KpiCard
          title="Активных"
          value={activeCount}
          icon={<CheckCircle className="h-5 w-5 text-success-500" />}
          accent="success"
        />
        <KpiCard
          title="Неактивных"
          value={employees.length - activeCount}
          icon={<XCircle className="h-5 w-5 text-neutral-400" />}
          accent={employees.length - activeCount > 0 ? 'warning' : 'none'}
        />
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input
            label="Поиск"
            placeholder="Имя, email или UUID..."
            leftIcon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            label="Роль"
            value={roleFilter ?? ''}
            onChange={(e) => setParam('role', e.target.value || null)}
          >
            <option value="">Все роли</option>
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </div>
        <div className="w-40">
          <Select
            label="Статус"
            value={statusFilter ?? ''}
            onChange={(e) => setParam('status', e.target.value || null)}
          >
            <option value="">Все</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </Select>
        </div>
        {hasFilters && (
          <div className="pb-0.5">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> Сбросить
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      {!employees.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Нет сотрудников"
          description="Добавьте первого сотрудника, нажав кнопку выше"
          action={
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" /> Добавить сотрудника
            </Button>
          }
        />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title="Ничего не найдено"
          description="Попробуйте изменить фильтры поиска"
        />
      ) : (
        <Table
          columns={[
            {
              key: 'name',
              header: 'Сотрудник',
              render: (e) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-xs shrink-0">
                    {e.firstName[0]}{e.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {e.firstName} {e.lastName}
                    </p>
                    <p className="text-xs text-neutral-400">{e.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Роль',
              render: (e) => (
                <Badge variant={ROLE_BADGE[e.role]} dot={false}>
                  {ROLE_LABELS[e.role]}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Статус',
              render: (e) => (
                <Badge variant={e.isActive ? 'active' : 'cancelled'} dot>
                  {e.isActive ? 'Активен' : 'Неактивен'}
                </Badge>
              ),
            },
            {
              key: 'hiredAt',
              header: 'Принят',
              render: (e) => e.hiredAt ? formatDate(e.hiredAt) : '—',
            },
            {
              key: 'workload',
              header: 'Нагрузка',
              render: (e) => {
                const count = workloadMap[e.id] ?? 0
                if (!count) return <span className="text-xs text-neutral-400">—</span>
                return (
                  <span className={[
                    'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    count >= 5
                      ? 'bg-danger-50 text-danger-700'
                      : count >= 3
                      ? 'bg-warning-50 text-warning-700'
                      : 'bg-success-50 text-success-700',
                  ].join(' ')}>
                    <ClipboardList className="h-3 w-3" />
                    {count}
                  </span>
                )
              },
            },
            {
              key: 'actions',
              header: '',
              render: (e) => (
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    size="xs"
                    variant="ghost"
                    title="Назначить задачу"
                    onClick={(ev) => { ev.stopPropagation(); setAssignEmployee(e) }}
                  >
                    <Zap className="h-3.5 w-3.5 text-warning-500" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(ev) => { ev.stopPropagation(); setDetailEmployee(e) }}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(ev) => { ev.stopPropagation(); setEditEmployee(e) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm(e) }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger-500" />
                  </Button>
                </div>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(e) => e.id}
          onRowClick={(e) => setDetailEmployee(e)}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <EmployeeFormModal onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}

      {/* Edit modal */}
      {editEmployee && (
        <EmployeeFormModal
          initial={editEmployee}
          onSave={handleEdit}
          onClose={() => setEditEmployee(null)}
        />
      )}

      {/* Detail modal */}
      {detailEmployee && (
        <EmployeeDetail
          employee={detailEmployee}
          onEdit={() => { setEditEmployee(detailEmployee); setDetailEmployee(null) }}
          onAssign={() => { setAssignEmployee(detailEmployee); setDetailEmployee(null) }}
          onClose={() => setDetailEmployee(null)}
        />
      )}

      {/* Quick assign modal */}
      {assignEmployee && (
        <QuickAssignModal
          employee={assignEmployee}
          onClose={() => setAssignEmployee(null)}
        />
      )}

      {uuidAssignOpen && (
        <AssignTaskByUuidModal onClose={() => setUuidAssignOpen(false)} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Modal open onClose={() => setDeleteConfirm(null)} title="Удалить сотрудника?" size="sm">
          <div className="p-6 space-y-4">
            <p className="text-neutral-700 dark:text-neutral-300">
              Удалить{' '}
              <span className="font-semibold">
                {deleteConfirm.firstName} {deleteConfirm.lastName}
              </span>{' '}
              из реестра? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
              <Button variant="danger" onClick={handleDelete}>Удалить</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
