import { apiClient } from '@/shared/api'
import type {
  Order,
  OrderItem,
  CreateOrderDto,
  UpdateOrderDto,
  AddOrderItemDto,
  OrderType,
  OrderStatus,
} from '@/entities/order/types'

export const ordersApi = {
  list: async (params?: {
    warehouseId?: string
    type?: OrderType
    status?: OrderStatus
  }): Promise<Order[]> => {
    const { data } = await apiClient.get<Order[]>('/orders', { params })
    return data
  },

  get: async (id: string): Promise<Order> => {
    const { data } = await apiClient.get<Order>(`/orders/${id}`)
    return data
  },

  create: async (dto: CreateOrderDto): Promise<Order> => {
    const { data } = await apiClient.post<Order>('/orders', dto)
    return data
  },

  update: async ({ id, ...dto }: UpdateOrderDto & { id: string }): Promise<Order> => {
    const { data } = await apiClient.patch<Order>(`/orders/${id}`, dto)
    return data
  },

  addItem: async ({
    orderId,
    ...dto
  }: AddOrderItemDto & { orderId: string }): Promise<OrderItem> => {
    const { data } = await apiClient.post<OrderItem>(`/orders/${orderId}/items`, dto)
    return data
  },

  removeItem: async ({
    orderId,
    itemId,
  }: {
    orderId: string
    itemId: string
  }): Promise<void> => {
    await apiClient.delete(`/orders/${orderId}/items/${itemId}`)
  },

  confirm: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/confirm`)
    return data
  },

  startPicking: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/start-picking`)
    return data
  },

  markPicked: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/mark-picked`)
    return data
  },

  startPacking: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/start-packing`)
    return data
  },

  markPacked: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/mark-packed`)
    return data
  },

  ship: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/ship`)
    return data
  },

  deliver: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/deliver`)
    return data
  },

  cancel: async (id: string): Promise<Order> => {
    const { data } = await apiClient.post<Order>(`/orders/${id}/cancel`)
    return data
  },
}
