'use client'

import { useState } from 'react'
import { useTasks, useTaskTransition, useCreateTask } from '@/features/tasks/api/use-tasks'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { TasksTable } from '@/widgets/tasks/tasks-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import { TaskType, TaskPriority, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/entities/task/types'
import type { Task } from '@/entities/task/types'

const createSchema = z.object({
  warehouseId: z.string().min(1),
  type: z.nativeEnum(TaskType),
  title: z.string().min(1, 'Обязательное поле'),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.NORMAL),
  description: z.string().optional(),
  dueAt: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>

export default function TasksPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()
  const { data: tasks, isLoading } = useTasks({ warehouseId: selectedWarehouseId ?? undefined })
  const transitions = useTaskTransition()
  const createTask = useCreateTask()
  const [createOpen, setCreateOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      warehouseId: selectedWarehouseId ?? '',
      priority: TaskPriority.NORMAL,
      type: TaskType.PICKING,
    },
  })

  const onSubmit = (data: CreateForm) => {
    createTask.mutate(data, { onSuccess: () => { setCreateOpen(false); reset() } })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Задачи</h1>
          <p className="text-sm text-neutral-500 mt-0.5">{tasks?.length ?? 0} задач</p>
        </div>
        <div className="flex items-center gap-3">
          {warehouses && warehouses.length > 0 && (
            <Select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-48"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать задачу
          </Button>
        </div>
      </div>

      <TasksTable
        tasks={tasks}
        loading={isLoading}
        onStart={(t: Task) => transitions.start.mutate(t.id)}
        onComplete={(t: Task) => transitions.complete.mutate({ id: t.id })}
        onCancel={(t: Task) => transitions.cancel.mutate(t.id)}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новая задача">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Select label="Склад" required {...register('warehouseId')}>
            <option value="">Выберите склад</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
          <Select label="Тип задачи" {...register('type')}>
            {Object.values(TaskType).map((t) => (
              <option key={t} value={t}>{TASK_TYPE_LABELS[t]}</option>
            ))}
          </Select>
          <Input
            label="Название"
            placeholder="Сборка заказа SO-2847"
            error={errors.title?.message}
            required
            {...register('title')}
          />
          <Select label="Приоритет" {...register('priority')}>
            {Object.values(TaskPriority).map((p) => (
              <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
            ))}
          </Select>
          <Input label="Срок выполнения" type="datetime-local" {...register('dueAt')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={createTask.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
