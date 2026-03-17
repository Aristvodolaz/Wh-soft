'use client'

import { useState } from 'react'
import { Table } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card } from '@/shared/ui/card'
import type { Task } from '@/entities/task/types'
import {
  TaskStatus,
  TaskPriority,
  TASK_STATUS_LABELS,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
} from '@/entities/task/types'
import { formatDateTime } from '@/shared/lib/format'
import { Play, CheckCircle, XCircle } from 'lucide-react'

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
  [TaskPriority.HIGH]: 'text-warning-600 font-medium',
  [TaskPriority.URGENT]: 'text-danger-600 font-bold',
}

interface TasksTableProps {
  tasks?: Task[]
  loading?: boolean
  onStart?: (task: Task) => void
  onComplete?: (task: Task) => void
  onCancel?: (task: Task) => void
}

export function TasksTable({ tasks = [], loading, onStart, onComplete, onCancel }: TasksTableProps) {
  const [search, setSearch] = useState('')

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase()
    return t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
  })

  const columns = [
    {
      key: 'title' as const,
      header: 'Задача',
      render: (row: Task) => (
        <div>
          <p className="font-medium text-neutral-900">{row.title}</p>
          <p className="text-xs text-neutral-400">{TASK_TYPE_LABELS[row.type]}</p>
        </div>
      ),
    },
    {
      key: 'priority' as const,
      header: 'Приоритет',
      render: (row: Task) => (
        <span className={`text-sm ${PRIORITY_COLORS[row.priority]}`}>
          {TASK_PRIORITY_LABELS[row.priority]}
        </span>
      ),
    },
    {
      key: 'status' as const,
      header: 'Статус',
      render: (row: Task) => (
        <Badge variant={STATUS_BADGE[row.status]}>
          {TASK_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: 'dueAt' as const,
      header: 'Срок',
      render: (row: Task) =>
        row.dueAt ? (
          <span className="text-sm text-neutral-500">{formatDateTime(row.dueAt)}</span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'id' as const,
      header: 'Действия',
      render: (row: Task) => (
        <div className="flex items-center gap-1">
          {row.status === TaskStatus.ASSIGNED && (
            <Button variant="ghost" size="icon-sm" title="Начать" onClick={() => onStart?.(row)}>
              <Play className="h-4 w-4 text-primary-600" />
            </Button>
          )}
          {row.status === TaskStatus.IN_PROGRESS && (
            <Button variant="ghost" size="icon-sm" title="Завершить" onClick={() => onComplete?.(row)}>
              <CheckCircle className="h-4 w-4 text-success-600" />
            </Button>
          )}
          {[TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(row.status) && (
            <Button variant="ghost" size="icon-sm" title="Отменить" onClick={() => onCancel?.(row)}>
              <XCircle className="h-4 w-4 text-danger-500" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <Card>
      <div className="px-4 py-3 border-b border-neutral-100">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Поиск по задачам..."
          className="max-w-sm"
        />
      </div>
      {loading ? (
        <TableSkeleton rows={10} cols={5} />
      ) : !filtered.length ? (
        <EmptyState title="Задачи не найдены" />
      ) : (
        <Table
          columns={columns}
          data={filtered}
          keyExtractor={(t) => t.id}
        />
      )}
    </Card>
  )
}
