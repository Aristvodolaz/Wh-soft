'use client'

import { use } from 'react'
import { useOrder, useOrderTransition } from '@/features/orders/api/use-orders'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { ORDER_STATUS_LABELS, OrderStatus } from '@/entities/order/types'
import { formatDateTime } from '@/shared/lib/format'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: order, isLoading } = useOrder(id)
  const transitions = useOrderTransition()

  if (isLoading) return <FullPageSpinner />
  if (!order) return <div className="p-6"><EmptyState title="Заказ не найден" /></div>

  const isPending = Object.values(transitions).some((m) => m.isPending)

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
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
        {/* State transitions */}
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
        {/* Order info */}
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

        {/* Items */}
        <Card className="col-span-2">
          <CardHeader>
            <h3 className="font-semibold">Позиции заказа ({order.items?.length ?? 0})</h3>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
