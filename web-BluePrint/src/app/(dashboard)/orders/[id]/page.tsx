'use client'

import { useState } from 'react'
import { useOrder, useOrderTransition, useAddOrderItem, useRemoveOrderItem } from '@/features/orders/api/use-orders'
import { useProducts } from '@/features/inventory/api/use-inventory'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { ORDER_STATUS_LABELS, OrderStatus } from '@/entities/order/types'
import { formatDateTime } from '@/shared/lib/format'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const STATUS_BADGE: Record<OrderStatus, 'active' | 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'draft'> = {
  [OrderStatus.DRAFT]: 'draft',
  [OrderStatus.CONFIRMED]: 'pending',
  [OrderStatus.IN_PICKING]: 'in-progress',
  [OrderStatus.PICKED]: 'in-progress',
  [OrderStatus.IN_PACKING]: 'in-progress',
  [OrderStatus.PACKED]: 'pending',
  [OrderStatus.SHIPPED]: 'active',
  [OrderStatus.DELIVERED]: 'completed',
  [OrderStatus.CANCELLED]: 'cancelled',
  [OrderStatus.RETURNED]: 'cancelled',
}

const addItemSchema = z.object({
  productId: z.string().min(1, 'Выберите товар'),
  requestedQuantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0).optional(),
})
type AddItemForm = z.infer<typeof addItemSchema>

export default function OrderDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const { data: order, isLoading } = useOrder(id)
  const { data: products } = useProducts()
  const transitions = useOrderTransition()
  const addItem = useAddOrderItem()
  const removeItem = useRemoveOrderItem()
  const [addItemOpen, setAddItemOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { requestedQuantity: 1 },
  })

  const onAddItem = (data: AddItemForm) => {
    addItem.mutate({ orderId: id, ...data }, {
      onSuccess: () => { setAddItemOpen(false); reset() },
    })
  }

  if (isLoading) return <FullPageSpinner />
  if (!order) return <div className="p-6"><EmptyState title="Заказ не найден" /></div>

  const isPending = Object.values(transitions).some((m) => m.isPending)
  const isDraft = order.status === OrderStatus.DRAFT

  return (
    <div className="p-6 space-y-6">
      <Link href="/orders" className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
        <ArrowLeft className="h-4 w-4" />
        Назад к заказам
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">
              {order.orderNumber || `Заказ #${order.id.slice(0, 8)}`}
            </h1>
            <Badge variant={STATUS_BADGE[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500 mt-1">Создан: {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {order.status === OrderStatus.DRAFT && (
            <Button size="sm" onClick={() => transitions.confirm.mutate(order.id)} loading={isPending}>
              Подтвердить
            </Button>
          )}
          {order.status === OrderStatus.CONFIRMED && (
            <Button size="sm" onClick={() => transitions.startPicking.mutate(order.id)} loading={isPending}>
              Начать сборку
            </Button>
          )}
          {order.status === OrderStatus.IN_PICKING && (
            <Button size="sm" variant="success" onClick={() => transitions.markPicked.mutate(order.id)} loading={isPending}>
              Сборка завершена
            </Button>
          )}
          {order.status === OrderStatus.PICKED && (
            <Button size="sm" onClick={() => transitions.startPacking.mutate(order.id)} loading={isPending}>
              Начать упаковку
            </Button>
          )}
          {order.status === OrderStatus.IN_PACKING && (
            <Button size="sm" variant="success" onClick={() => transitions.markPacked.mutate(order.id)} loading={isPending}>
              Упаковка завершена
            </Button>
          )}
          {order.status === OrderStatus.PACKED && (
            <Button size="sm" onClick={() => transitions.ship.mutate(order.id)} loading={isPending}>
              Отгрузить
            </Button>
          )}
          {order.status === OrderStatus.SHIPPED && (
            <Button size="sm" variant="success" onClick={() => transitions.deliver.mutate(order.id)} loading={isPending}>
              Доставлен
            </Button>
          )}
          {![OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.SHIPPED].includes(order.status) && (
            <Button size="sm" variant="danger" onClick={() => transitions.cancel.mutate(order.id)} loading={isPending}>
              Отменить
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardHeader><h3 className="font-semibold">Информация</h3></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-neutral-400">Тип</p>
              <p className="text-sm font-medium">{order.type === 'INBOUND' ? 'Входящий' : 'Исходящий'}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-400">Приоритет</p>
              <p className="text-sm font-medium">{order.priority}</p>
            </div>
            {order.customerName && (
              <div>
                <p className="text-xs text-neutral-400">Клиент</p>
                <p className="text-sm font-medium">{order.customerName}</p>
              </div>
            )}
            {order.customerEmail && (
              <div>
                <p className="text-xs text-neutral-400">Email</p>
                <p className="text-sm">{order.customerEmail}</p>
              </div>
            )}
            {order.notes && (
              <div>
                <p className="text-xs text-neutral-400">Примечание</p>
                <p className="text-sm">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <h3 className="font-semibold">Позиции заказа ({order.items?.length ?? 0})</h3>
            {isDraft && (
              <Button size="sm" variant="secondary" onClick={() => setAddItemOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {!order.items?.length ? (
              <EmptyState title="Нет позиций" className="py-8" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100">
                    <th className="px-4 py-2 text-left text-xs text-neutral-500 font-semibold">Товар</th>
                    <th className="px-4 py-2 text-right text-xs text-neutral-500 font-semibold">Кол-во</th>
                    <th className="px-4 py-2 text-right text-xs text-neutral-500 font-semibold">Собрано</th>
                    {isDraft && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-neutral-50">
                      <td className="px-4 py-2">
                        <p className="font-medium">{item.product?.name ?? item.productId}</p>
                        {item.product?.sku && <p className="text-xs font-mono-sku text-neutral-400">{item.product.sku}</p>}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{item.requestedQuantity}</td>
                      <td className="px-4 py-2 text-right text-neutral-500">{item.pickedQuantity ?? '—'}</td>
                      {isDraft && (
                        <td className="px-2 py-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeItem.mutate({ orderId: id, itemId: item.id })}
                            loading={removeItem.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger-500" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal open={addItemOpen} onClose={() => setAddItemOpen(false)} title="Добавить позицию">
        <form onSubmit={handleSubmit(onAddItem)} className="p-6 space-y-4">
          <Select label="Товар" required error={errors.productId?.message} {...register('productId')}>
            <option value="">Выберите товар</option>
            {products?.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </Select>
          <Input
            label="Количество"
            type="number"
            min="1"
            error={errors.requestedQuantity?.message}
            required
            {...register('requestedQuantity')}
          />
          <Input
            label="Цена за единицу"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            {...register('unitPrice')}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setAddItemOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={addItem.isPending}>
              Добавить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
