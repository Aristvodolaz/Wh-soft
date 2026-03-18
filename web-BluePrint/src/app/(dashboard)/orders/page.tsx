'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useOrders, useCreateOrder } from '@/features/orders/api/use-orders'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { OrdersTable } from '@/widgets/orders/orders-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Filter, X } from 'lucide-react'
import { OrderType, OrderStatus, ORDER_STATUS_LABELS } from '@/entities/order/types'

const createSchema = z.object({
  warehouseId: z.string().min(1),
  type: z.nativeEnum(OrderType).default(OrderType.OUTBOUND),
  orderNumber: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  priority: z.coerce.number().min(1).max(10).default(5),
})

type CreateForm = z.infer<typeof createSchema>

export default function OrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: warehouses } = useWarehouses()
  const warehouseList = Array.isArray(warehouses) ? warehouses : []
  const { selectedWarehouseId, setWarehouse } = useAuthStore()
  const { data: orders, isLoading } = useOrders({ warehouseId: selectedWarehouseId ?? undefined })
  const createOrder = useCreateOrder()
  const [createOpen, setCreateOpen] = useState(false)

  // URL-driven filters
  const statusFilter = searchParams.get('status') as OrderStatus | null
  const typeFilter = searchParams.get('type') as OrderType | null

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/orders?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  const clearFilters = () => {
    router.replace('/orders', { scroll: false })
  }

  const hasFilters = statusFilter || typeFilter

  // Apply URL filters on top of server data
  const filtered = (orders ?? []).filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false
    if (typeFilter && o.type !== typeFilter) return false
    return true
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: {},
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      warehouseId: selectedWarehouseId ?? '',
      type: OrderType.OUTBOUND,
      priority: 5,
    },
  })

  const onSubmit = (data: CreateForm) => {
    createOrder.mutate(data, {
      onSuccess: () => {
        setCreateOpen(false)
        reset()
      },
    })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Заказы</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filtered.length} из {orders?.length ?? 0} заказов
          </p>
        </div>
        <div className="flex items-center gap-3">
          {warehouseList.length > 0 && (
            <Select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-48"
            >
              {warehouseList.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать заказ
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-neutral-400 shrink-0" />
        <Select
          value={statusFilter ?? ''}
          onChange={(e) => setParam('status', e.target.value || null)}
          className="w-44"
        >
          <option value="">Все статусы</option>
          {Object.values(OrderStatus).map((s) => (
            <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>
          ))}
        </Select>
        <Select
          value={typeFilter ?? ''}
          onChange={(e) => setParam('type', e.target.value || null)}
          className="w-40"
        >
          <option value="">Все типы</option>
          <option value={OrderType.INBOUND}>↓ Входящий</option>
          <option value={OrderType.OUTBOUND}>↑ Исходящий</option>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-3.5 w-3.5" />
            Сбросить
          </Button>
        )}
      </div>

      <OrdersTable orders={filtered} loading={isLoading} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый заказ">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Select label="Склад" required {...register('warehouseId')}>
            <option value="">Выберите склад</option>
            {warehouseList.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </Select>
          <Select label="Тип" {...register('type')}>
            <option value={OrderType.OUTBOUND}>Исходящий (отгрузка)</option>
            <option value={OrderType.INBOUND}>Входящий (приёмка)</option>
          </Select>
          <Input label="Номер заказа" placeholder="SO-2025-001" {...register('orderNumber')} />
          <Input label="Клиент" placeholder="ООО Ромашка" {...register('customerName')} />
          <Input label="Email клиента" type="email" {...register('customerEmail')} />
          <Input
            label="Приоритет (1-10)"
            type="number"
            min="1"
            max="10"
            {...register('priority')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={createOrder.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
