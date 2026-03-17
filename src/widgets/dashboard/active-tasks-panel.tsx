'use client'

import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { useTasks } from '@/features/tasks/api/use-tasks'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { TASK_TYPE_LABELS, TaskStatus } from '@/entities/task/types'
import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/shared/lib/format'

export function ActiveTasksPanel() {
  const warehouseId = useAuthStore((s) => s.selectedWarehouseId) ?? ''
  const { data: tasks, isLoading } = useTasks({
    warehouseId,
    status: TaskStatus.IN_PROGRESS,
  })

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-neutral-900">Активные задачи</h3>
        <Link href="/tasks" className="text-sm text-primary-600 hover:underline">
          Все задачи
        </Link>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : !tasks?.length ? (
          <EmptyState
            icon={<ClipboardList className="h-8 w-8" />}
            title="Нет активных задач"
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {tasks.slice(0, 6).map((task) => (
              <li key={task.id}>
                <Link
                  href={`/tasks`}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{task.title}</p>
                    <p className="text-xs text-neutral-400">
                      {TASK_TYPE_LABELS[task.type]}
                      {task.dueAt && ` · до ${formatDate(task.dueAt)}`}
                    </p>
                  </div>
                  <Badge variant="in-progress" dot={false}>
                    В работе
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
