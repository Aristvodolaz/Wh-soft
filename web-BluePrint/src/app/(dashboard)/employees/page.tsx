'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEmployeeStore, type EmployeeProfile } from '@/features/employees/store/employee-store'
import { usePermissions } from '@/shared/hooks/use-permissions'
import { KpiCard } from '@/shared/ui/kpi-card'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { Modal } from '@/shared/ui/modal'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table } from '@/shared/ui/table'
import {
  Users, Search, CheckCircle, XCircle,
  Plus, Pencil, Trash2, BarChart2, ListTodo, UserCircle,
  X, Zap, ClipboardList, Shuffle, Copy, Check, ShieldOff,
} from 'lucide-react'
import { formatDate } from '@/shared/lib/format'
import { Role } from '@/entities/auth/types'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<Role, string> = {
  [Role.SUPER_ADMIN]: 'Супер-Адм.',
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

// ─── Employee Form Modal ──────────────────────────────────────────────────────

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
    defaultValues: initial ? { ...initial } : { role: Role.WORKER, isActive: true },
  })

  const handleGenerateUuid = useCallback(() => {
    form.setValue('id', crypto.randomUUID(), { shouldValidate: true })
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
    <Modal open onClose={onClose} title={initial ? 'Редактировать сотрудника' : 'Новый сотрудник'} size="lg">
      <form onSubmit={form.handleSubmit(onSave)} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Имя" required error={form.formState.errors.firstName?.message} {...form.register('firstName')} />
          <Input label="Фамилия" required error={form.formState.errors.lastName?.message} {...form.register('lastName')} />
        </div>

        {/* UUID field */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            UUID сотрудника <span className="text-danger-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              className={[
                'flex-1 h-9 px-3 text-sm rounded-lg border font-mono',
                'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent',
                'placeholder:text-neutral-400',
                initial ? 'bg-neutral-50 dark:bg-neutral-800 cursor-not-allowed text-neutral-500' : '',
                form.formState.errors.id ? 'border-danger-400' : 'border-neutral-200 dark:border-neutral-700',
              ].join(' ')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              disabled={!!initial}
              {...form.register('id')}
            />
            {!initial && (
              <button
                type="button"
                onClick={handleGenerateUuid}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
              >
                <Shuffle className="h-3.5 w-3.5 text-primary-500" />
                Сгенерировать
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyUuid}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success-500" /> : <Copy className="h-3.5 w-3.5 text-neutral-400" />}
            </button>
          </div>
          {form.formState.errors.id && (
            <p className="text-xs text-danger-500">{form.formState.errors.id.message}</p>
          )}
          <p className="text-xs text-neutral-400">Должен совпадать с ID пользователя в системе, или сгенерируйте новый</p>
        </div>

        <Input label="Email" type="email" required error={form.formState.errors.email?.message} {...form.register('email')} />
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
            <input type="checkbox" id="isActive" className="h-4 w-4 rounded border-neutral-300 text-primary-600" {...form.register('isActive')} />
            <label htmlFor="isActive" className="text-sm text-neutral-700">Активен</label>
          </div>
        </div>
        <Input label="Заметки" placeholder="Доп. информация..." {...form.register('notes')} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Отмена</Button>
          <Button type="submit">{initial ? 'Сохранить' : 'Добавить'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Employee Detail Drawer ───────────────────────────────────────────────────

function EmployeeDetail({
  employee, onEdit, onAssign, onClose, canEdit, canAssign,
}: {
  employee: EmployeeProfile
  onEdit: () => void
  onAssign: () => void
  onClose: () => void
  canEdit: boolean
  canAssign: boolean
}) {
  const [tab, setTab] = useState<'profile' | 'tasks'>('profile')

  return (
    <Modal open onClose={onClose} title={`${employee.firstName} ${employee.lastName}`} size="lg">
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold text-sm">
              {employee.firstName[0]}{employee.lastName[0]}
            </div>
            <div>
              <p className="text-sm text-neutral-500">{employee.email}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant={ROLE_BADGE[employee.role]} dot={false}>{ROLE_LABELS[employee.role]}</Badge>
                {!employee.isActive && <Badge variant="cancelled" dot={false}>Неактивен</Badge>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canAssign && (
              <Button size="sm" variant="ghost" onClick={onAssign}>
                <Zap className="h-3 w-3" /> Задачу
              </Button>
            )}
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil className="h-3 w-3" /> Редактировать
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-700 px-6">
          {([['profile', 'Профиль', <UserCircle key="p" className="h-4 w-4" />], ['tasks', 'Задачи', <ListTodo key="t" className="h-4 w-4" />]] as const).map(([key, label, icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === key ? 'border-primary-500 text-primary-600' : 'border-transparent text-neutral-500 hover:text-neutral-700',
              ].join(' ')}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {tab === 'profile' && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['UUID', employee.id],
                ['Имя', `${employee.firstName} ${employee.lastName}`],
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
          {tab === 'tasks' && (
            <EmptyState
              icon={<ListTodo className="h-10 w-10" />}
              title="Нет назначенных задач"
              description="Задачи сотрудника будут отображаться здесь"
            />
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
  const { employees: emp } = usePermissions()

  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editEmployee, setEditEmployee] = useState<EmployeeProfile | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<EmployeeProfile | null>(null)
  const [assignEmployee, setAssignEmployee] = useState<EmployeeProfile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<EmployeeProfile | null>(null)

  // URL-driven filters
  const roleFilter = searchParams.get('role') as Role | null
  const statusFilter = searchParams.get('status') as 'active' | 'inactive' | null

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    router.replace(`/employees?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const clearFilters = () => router.replace('/employees', { scroll: false })
  const hasFilters = roleFilter || statusFilter

  const filtered = useMemo(() => employees.filter((e) => {
    const q = search.toLowerCase()
    const matchQ = !q || e.firstName.toLowerCase().includes(q) || e.lastName.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)
    const matchRole = !roleFilter || e.role === roleFilter
    const matchStatus = !statusFilter || (statusFilter === 'active' ? e.isActive : !e.isActive)
    return matchQ && matchRole && matchStatus
  }), [employees, search, roleFilter, statusFilter])

  const handleAdd = (data: EmployeeForm) => { addEmployee({ ...data, isActive: data.isActive ?? true }); setShowAdd(false) }
  const handleEdit = (data: EmployeeForm) => {
    if (!editEmployee) return
    updateEmployee(editEmployee.id, data)
    setEditEmployee(null)
    if (detailEmployee?.id === editEmployee.id) setDetailEmployee({ ...detailEmployee, ...data })
  }
  const handleDelete = () => {
    if (!deleteConfirm) return
    removeEmployee(deleteConfirm.id)
    setDeleteConfirm(null)
    if (detailEmployee?.id === deleteConfirm.id) setDetailEmployee(null)
  }

  // Role guard
  if (!emp.view) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ShieldOff className="h-12 w-12 text-neutral-300" />}
          title="Нет доступа"
          description="У вашей роли нет прав на просмотр раздела «Сотрудники»"
        />
      </div>
    )
  }

  const activeCount = employees.filter((e) => e.isActive).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
            <Users className="h-6 w-6 text-primary-500" /> Сотрудники
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">{filtered.length} из {employees.length} сотрудников</p>
        </div>
        {emp.add && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Добавить сотрудника
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard title="Всего" value={employees.length} icon={<Users className="h-5 w-5 text-primary-500" />} />
        <KpiCard title="Активных" value={activeCount} icon={<CheckCircle className="h-5 w-5 text-success-500" />} accent="success" />
        <KpiCard title="Неактивных" value={employees.length - activeCount} icon={<XCircle className="h-5 w-5 text-neutral-400" />} accent={employees.length - activeCount > 0 ? 'warning' : 'none'} />
      </div>

      {/* Filters */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-48">
          <Input label="Поиск" placeholder="Имя, email или UUID..." leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-44">
          <Select label="Роль" value={roleFilter ?? ''} onChange={(e) => setParam('role', e.target.value || null)}>
            <option value="">Все роли</option>
            {Object.values(Role).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </div>
        <div className="w-40">
          <Select label="Статус" value={statusFilter ?? ''} onChange={(e) => setParam('status', e.target.value || null)}>
            <option value="">Все</option>
            <option value="active">Активные</option>
            <option value="inactive">Неактивные</option>
          </Select>
        </div>
        {hasFilters && (
          <div className="pb-0.5">
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-3.5 w-3.5" /> Сбросить</Button>
          </div>
        )}
      </div>

      {/* Table */}
      {!employees.length ? (
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Нет сотрудников"
          description="Добавьте первого сотрудника"
          action={emp.add ? <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" /> Добавить</Button> : undefined}
        />
      ) : !filtered.length ? (
        <EmptyState icon={<Search className="h-10 w-10" />} title="Ничего не найдено" description="Попробуйте изменить фильтры" />
      ) : (
        <Table
          columns={[
            {
              key: 'name', header: 'Сотрудник',
              render: (e) => (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xs shrink-0">
                    {e.firstName[0]}{e.lastName[0]}
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{e.firstName} {e.lastName}</p>
                    <p className="text-xs text-neutral-400">{e.email}</p>
                  </div>
                </div>
              ),
            },
            { key: 'role', header: 'Роль', render: (e) => <Badge variant={ROLE_BADGE[e.role]} dot={false}>{ROLE_LABELS[e.role]}</Badge> },
            { key: 'status', header: 'Статус', render: (e) => <Badge variant={e.isActive ? 'active' : 'cancelled'} dot>{e.isActive ? 'Активен' : 'Неактивен'}</Badge> },
            { key: 'hiredAt', header: 'Принят', render: (e) => e.hiredAt ? formatDate(e.hiredAt) : '—' },
            {
              key: 'actions', header: '',
              render: (e) => (
                <div className="flex items-center gap-1 justify-end">
                  {emp.assign && (
                    <Button size="xs" variant="ghost" title="Назначить задачу" onClick={(ev) => { ev.stopPropagation(); setAssignEmployee(e) }}>
                      <Zap className="h-3.5 w-3.5 text-warning-500" />
                    </Button>
                  )}
                  <Button size="xs" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setDetailEmployee(e) }}>
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Button>
                  {emp.edit && (
                    <Button size="xs" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setEditEmployee(e) }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {emp.remove && (
                    <Button size="xs" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm(e) }}>
                      <Trash2 className="h-3.5 w-3.5 text-danger-500" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(e) => e.id}
          onRowClick={(e) => setDetailEmployee(e)}
        />
      )}

      {/* Modals */}
      {showAdd && emp.add && <EmployeeFormModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {editEmployee && emp.edit && <EmployeeFormModal initial={editEmployee} onSave={handleEdit} onClose={() => setEditEmployee(null)} />}
      {detailEmployee && (
        <EmployeeDetail
          employee={detailEmployee}
          onEdit={() => { setEditEmployee(detailEmployee); setDetailEmployee(null) }}
          onAssign={() => { setAssignEmployee(detailEmployee); setDetailEmployee(null) }}
          onClose={() => setDetailEmployee(null)}
          canEdit={emp.edit}
          canAssign={emp.assign}
        />
      )}
      {assignEmployee && emp.assign && (
        <Modal open onClose={() => setAssignEmployee(null)} title={`Назначить задачу — ${assignEmployee.firstName} ${assignEmployee.lastName}`} size="md">
          <div className="p-6 space-y-4">
            <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="Нет доступных задач" description="Все задачи уже назначены или выполнены" />
            <div className="flex justify-end"><Button variant="secondary" onClick={() => setAssignEmployee(null)}>Закрыть</Button></div>
          </div>
        </Modal>
      )}
      {deleteConfirm && emp.remove && (
        <Modal open onClose={() => setDeleteConfirm(null)} title="Удалить сотрудника?" size="sm">
          <div className="p-6 space-y-4">
            <p className="text-neutral-700">Удалить <span className="font-semibold">{deleteConfirm.firstName} {deleteConfirm.lastName}</span> из реестра? Это действие нельзя отменить.</p>
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
