'use client'

import { useMyTasks, useTaskTransition } from '@/features/tasks/api/use-tasks'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { TaskStatus, TaskPriority, TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/entities/task/types'
import type { Task } from '@/entities/task/types'
import { formatDateTime } from '@/shared/lib/format'
import { Play, CheckCircle, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'

const STATUS_BADGE: Record<TaskStatus, 'active' | 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'failed' | 'draft'> = {
  [TaskStatus.PENDING]: 'pending',
  [TaskStatus.ASSIGNED]: 'pending',
  [TaskStatus.IN_PROGRESS]: 'in-progress',
  [TaskStatus.COMPLETED]: 'completed',
  [TaskStatus.FAILED]: 'failed',
  [TaskStatus.CANCELLED]: 'cancelled',
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-neutral-400',
  [TaskPriority.NORMAL]: 'text-neutral-600',
  [TaskPriority.HIGH]: 'text-warning-600',
  [TaskPriority.URGENT]: 'text-danger-600 font-bold',
}

export default function MyTasksPage() {
  const { data: tasks, isLoading } = useMyTasks()
  const transitions = useTaskTransition()

  const active = (tasks ?? []).filter((t) =>
    [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(t.status),
  )
  const pending = (tasks ?? []).filter((t) => t.status === TaskStatus.PENDING)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Мои задачи</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          {active.length} активных · {pending.length} ожидающих
        </p>
      </div>

      {isLoading ? (
        <Card><TableSkeleton rows={5} cols={4} /></Card>
      ) : !tasks?.length ? (
        <EmptyState
          title="Нет задач"
          description="У вас пока нет назначенных задач"
        />
      ) : (
        <div className="space-y-3">
          {(tasks as Task[]).map((task) => (
            <Card key={task.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={STATUS_BADGE[task.status]}>
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>
                    <span className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>
                      {TASK_PRIORITY_LABELS[task.priority]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-neutral-900">{task.title}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">{TASK_TYPE_LABELS[task.type]}</p>
                  {task.dueAt && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Срок: {formatDateTime(task.dueAt)}
                    </p>
                  )}
                  {task.orderId && (
                    <Link
                      href={`/orders/${task.orderId}`}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline mt-1"
                    >
                      <LinkIcon className="h-3 w-3" />
                      Открыть заказ
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {task.status === TaskStatus.ASSIGNED && (
                    <Button
                      size="sm"
                      onClick={() => transitions.start.mutate(task.id)}
                      loading={transitions.start.isPending}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Начать
                    </Button>
                  )}
                  {task.status === TaskStatus.IN_PROGRESS && (
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => transitions.complete.mutate({ id: task.id })}
                      loading={transitions.complete.isPending}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Завершить
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
