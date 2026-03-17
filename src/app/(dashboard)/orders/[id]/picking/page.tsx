'use client'

import { use, useState } from 'react'
import { useOrder, useOrderTransition } from '@/features/orders/api/use-orders'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { BarcodeScanner } from '@/shared/ui/barcode-scanner'
import Link from 'next/link'
import { ArrowLeft, Package, CheckCircle } from 'lucide-react'
import { OrderStatus, ORDER_STATUS_LABELS } from '@/entities/order/types'
import toast from 'react-hot-toast'
import { cn } from '@/shared/lib/cn'

export default function PickingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: order, isLoading } = useOrder(id)
  const transitions = useOrderTransition()
  const [picked, setPicked] = useState<Set<string>>(new Set())

  if (isLoading) return <FullPageSpinner />
  if (!order) return <div className="p-6"><EmptyState title="Заказ не найден" /></div>

  const allPicked = order.items.length > 0 && picked.size === order.items.length

  const togglePick = (itemId: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const onScan = (barcode: string) => {
    const item = order.items.find(
      (i) => i.product?.sku === barcode
    )
    if (!item) {
      toast.error(`Товар не найден в заказе: ${barcode}`)
      return
    }
    if (picked.has(item.id)) {
      toast(`Уже отсканировано: ${item.product?.name}`, { icon: '✓' })
      return
    }
    setPicked((prev) => new Set([...prev, item.id]))
    toast.success(`Собрано: ${item.product?.name}`)
  }

  const onMarkPicked = () => {
    transitions.markPicked.mutate(order.id)
  }

  const pickedCount = picked.size
  const totalCount = order.items.length
  const progress = totalCount > 0 ? Math.round((pickedCount / totalCount) * 100) : 0

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href={`/orders/${id}`} className="hover:text-neutral-700 flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Заказ {order.orderNumber ?? order.id.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">Сборка</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Лист сборки</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {order.orderNumber} · {order.customerName ?? 'Нет получателя'}
          </p>
        </div>
        <Badge variant={order.status === OrderStatus.IN_PICKING ? 'in-progress' : 'pending'}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700">Прогресс сборки</span>
          <span className="text-sm font-bold text-neutral-900">{pickedCount} / {totalCount}</span>
        </div>
        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              allPicked ? 'bg-success-500' : 'bg-primary-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Scanner */}
      <BarcodeScanner
        label="Сканировать товар"
        onScan={onScan}
      />

      {/* Items checklist */}
      {order.items.length === 0 ? (
        <EmptyState title="Нет позиций" description="В заказе нет товаров для сборки" />
      ) : (
        <div className="space-y-2">
          {order.items.map((item) => {
            const isPicked = picked.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => togglePick(item.id)}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-all',
                  isPicked
                    ? 'border-success-500 bg-success-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                )}
              >
                <div
                  className={cn(
                    'shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center',
                    isPicked
                      ? 'border-success-500 bg-success-500 text-white'
                      : 'border-neutral-300'
                  )}
                >
                  {isPicked && <CheckCircle className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-neutral-400 shrink-0" />
                    <span
                      className={cn(
                        'font-medium text-sm',
                        isPicked ? 'text-success-800 line-through' : 'text-neutral-900'
                      )}
                    >
                      {item.product?.name ?? item.productId}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="font-mono-sku text-xs text-neutral-400">{item.product?.sku}</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-neutral-900">
                    {item.requestedQuantity}
                  </div>
                  <div className="text-xs text-neutral-400">{item.product?.unit ?? 'шт'}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Action */}
      {order.status === OrderStatus.IN_PICKING && (
        <div className="flex justify-end pt-2">
          <Button
            onClick={onMarkPicked}
            disabled={!allPicked}
            loading={transitions.markPicked.isPending}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Завершить сборку ({pickedCount}/{totalCount})
          </Button>
        </div>
      )}
    </div>
  )
}
