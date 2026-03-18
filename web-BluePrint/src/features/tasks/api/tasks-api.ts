import { apiClient } from '@/shared/api'
import type {
  Task,
  CreateTaskDto,
  AssignTaskDto,
  CompleteTaskDto,
  TaskType,
  TaskStatus,
} from '@/entities/task/types'

export const tasksApi = {
  list: async (params?: {
    warehouseId?: string
    type?: TaskType
    status?: TaskStatus
  }): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>('/tasks', { params })
    return data
  },

  myTasks: async (): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>('/tasks/my')
    return data
  },

  overdue: async (warehouseId?: string): Promise<Task[]> => {
    const { data } = await apiClient.get<Task[]>('/tasks/overdue', {
      params: warehouseId ? { warehouseId } : undefined,
    })
    return data
  },

  get: async (id: string): Promise<Task> => {
    const { data } = await apiClient.get<Task>(`/tasks/${id}`)
    return data
  },

  create: async (dto: CreateTaskDto): Promise<Task> => {
    const { data } = await apiClient.post<Task>('/tasks', dto)
    return data
  },

  assign: async ({
    taskId,
    ...dto
  }: AssignTaskDto & { taskId: string }): Promise<Task> => {
    const { data } = await apiClient.patch<Task>(`/tasks/${taskId}/assign`, dto)
    return data
  },

  autoAssign: async (warehouseId: string, type?: TaskType): Promise<Task> => {
    const { data } = await apiClient.post<Task>('/tasks/auto-assign', null, {
      params: { warehouseId, ...(type && { type }) },
    })
    return data
  },

  claim: async (taskId: string): Promise<Task> => {
    const { data } = await apiClient.post<Task>(`/tasks/${taskId}/claim`)
    return data
  },

  start: async (id: string): Promise<Task> => {
    const { data } = await apiClient.post<Task>(`/tasks/${id}/start`)
    return data
  },

  complete: async ({
    id,
    ...dto
  }: CompleteTaskDto & { id: string }): Promise<Task> => {
    const { data } = await apiClient.post<Task>(`/tasks/${id}/complete`, dto)
    return data
  },

  fail: async ({
    id,
    ...dto
  }: CompleteTaskDto & { id: string }): Promise<Task> => {
    const { data } = await apiClient.post<Task>(`/tasks/${id}/fail`, dto)
    return data
  },

  cancel: async (id: string): Promise<Task> => {
    const { data } = await apiClient.post<Task>(`/tasks/${id}/cancel`)
    return data
  },
}
