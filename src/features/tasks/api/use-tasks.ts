import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from './tasks-api'
import type {
  AssignTaskDto,
  CompleteTaskDto,
  TaskType,
  TaskStatus,
} from '@/entities/task/types'
import toast from 'react-hot-toast'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (params?: object) => ['tasks', 'list', params] as const,
  my: ['tasks', 'my'] as const,
  overdue: (warehouseId?: string) => ['tasks', 'overdue', warehouseId] as const,
  detail: (id: string) => ['tasks', id] as const,
}

export function useTasks(params?: {
  warehouseId?: string
  type?: TaskType
  status?: TaskStatus
}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.list(params),
  })
}

export function useMyTasks() {
  return useQuery({
    queryKey: taskKeys.my,
    queryFn: tasksApi.myTasks,
  })
}

export function useOverdueTasks(warehouseId?: string) {
  return useQuery({
    queryKey: taskKeys.overdue(warehouseId),
    queryFn: () => tasksApi.overdue(warehouseId),
  })
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => tasksApi.get(id),
    enabled: !!id,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      toast.success('Задача создана')
    },
    onError: () => toast.error('Ошибка создания задачи'),
  })
}

export function useAssignTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: AssignTaskDto & { taskId: string }) => tasksApi.assign(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.detail(vars.taskId) })
      toast.success('Задача назначена')
    },
    onError: () => toast.error('Ошибка назначения'),
  })
}

export function useTaskTransition() {
  const qc = useQueryClient()

  const invalidate = (id: string) => {
    qc.invalidateQueries({ queryKey: taskKeys.all })
    qc.invalidateQueries({ queryKey: taskKeys.detail(id) })
  }

  const start = useMutation({
    mutationFn: tasksApi.start,
    onSuccess: (_, id) => { invalidate(id); toast.success('Задача начата') },
    onError: () => toast.error('Ошибка'),
  })

  const complete = useMutation({
    mutationFn: (dto: CompleteTaskDto & { id: string }) => tasksApi.complete(dto),
    onSuccess: (data) => { invalidate(data.id); toast.success('Задача выполнена') },
    onError: () => toast.error('Ошибка'),
  })

  const fail = useMutation({
    mutationFn: (dto: CompleteTaskDto & { id: string }) => tasksApi.fail(dto),
    onSuccess: (data) => { invalidate(data.id); toast('⚠ Задача помечена как провальная') },
    onError: () => toast.error('Ошибка'),
  })

  const cancel = useMutation({
    mutationFn: tasksApi.cancel,
    onSuccess: (_, id) => { invalidate(id); toast.success('Задача отменена') },
    onError: () => toast.error('Ошибка'),
  })

  return { start, complete, fail, cancel }
}
