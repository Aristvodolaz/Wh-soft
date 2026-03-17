import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from './orders-api'
import type {
  UpdateOrderDto,
  AddOrderItemDto,
  OrderType,
  OrderStatus,
} from '@/entities/order/types'
import toast from 'react-hot-toast'

export const orderKeys = {
  all: ['orders'] as const,
  list: (params?: object) => ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', id] as const,
}

export function useOrders(params?: {
  warehouseId?: string
  type?: OrderType
  status?: OrderStatus
}) {
  return useQuery({
    queryKey: orderKeys.list(params),
    queryFn: () => ordersApi.list(params),
  })
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
      toast.success('Заказ создан')
    },
    onError: () => toast.error('Ошибка создания заказа'),
  })
}

export function useUpdateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: UpdateOrderDto & { id: string }) => ordersApi.update(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: orderKeys.all })
      qc.invalidateQueries({ queryKey: orderKeys.detail(vars.id) })
    },
  })
}

export function useOrderTransition() {
  const qc = useQueryClient()

  const invalidate = (id: string) => {
    qc.invalidateQueries({ queryKey: orderKeys.all })
    qc.invalidateQueries({ queryKey: orderKeys.detail(id) })
  }

  const confirm = useMutation({
    mutationFn: ordersApi.confirm,
    onSuccess: (_, id) => {
      invalidate(id)
      toast.success('Заказ подтверждён')
    },
    onError: () => toast.error('Ошибка перехода статуса'),
  })

  const startPicking = useMutation({
    mutationFn: ordersApi.startPicking,
    onSuccess: (_, id) => { invalidate(id); toast.success('Начата сборка') },
    onError: () => toast.error('Ошибка'),
  })

  const markPicked = useMutation({
    mutationFn: ordersApi.markPicked,
    onSuccess: (_, id) => { invalidate(id); toast.success('Сборка завершена') },
    onError: () => toast.error('Ошибка'),
  })

  const startPacking = useMutation({
    mutationFn: ordersApi.startPacking,
    onSuccess: (_, id) => { invalidate(id); toast.success('Начата упаковка') },
    onError: () => toast.error('Ошибка'),
  })

  const markPacked = useMutation({
    mutationFn: ordersApi.markPacked,
    onSuccess: (_, id) => { invalidate(id); toast.success('Упаковка завершена') },
    onError: () => toast.error('Ошибка'),
  })

  const ship = useMutation({
    mutationFn: ordersApi.ship,
    onSuccess: (_, id) => { invalidate(id); toast.success('Заказ отгружен') },
    onError: () => toast.error('Ошибка'),
  })

  const deliver = useMutation({
    mutationFn: ordersApi.deliver,
    onSuccess: (_, id) => { invalidate(id); toast.success('Заказ доставлен') },
    onError: () => toast.error('Ошибка'),
  })

  const cancel = useMutation({
    mutationFn: ordersApi.cancel,
    onSuccess: (_, id) => { invalidate(id); toast.success('Заказ отменён') },
    onError: () => toast.error('Ошибка'),
  })

  return { confirm, startPicking, markPicked, startPacking, markPacked, ship, deliver, cancel }
}

export function useAddOrderItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: AddOrderItemDto & { orderId: string }) => ordersApi.addItem(dto),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: orderKeys.detail(vars.orderId) })
      toast.success('Позиция добавлена')
    },
    onError: () => toast.error('Ошибка добавления позиции'),
  })
}

export function useRemoveOrderItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      ordersApi.removeItem({ orderId, itemId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: orderKeys.detail(vars.orderId) })
      toast.success('Позиция удалена')
    },
    onError: () => toast.error('Ошибка удаления позиции'),
  })
}
