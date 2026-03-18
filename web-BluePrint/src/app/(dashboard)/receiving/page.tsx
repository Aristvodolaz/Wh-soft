'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useCreateOrder, useAddOrderItem, useOrderTransition } from '@/features/orders/api/use-orders'
import { useProducts } from '@/features/inventory/api/use-inventory'
import { BarcodeScanner } from '@/shared/ui/barcode-scanner'
import { Steps } from '@/shared/ui/steps'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { OrderType } from '@/entities/order/types'
import type { Order, OrderItem } from '@/entities/order/types'
import { Truck, Package, CheckCircle, Plus, ArrowRight, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

const STEPS = [
  { label: 'Склад', description: 'Выберите склад' },
  { label: 'Поставка', description: 'Данные заказа' },
  { label: 'Товары', description: 'Сканирование' },
  { label: 'Готово', description: 'Подтверждение' },
]

const step1Schema = z.object({
  warehouseId: z.string().min(1, 'Выберите склад'),
})
type Step1Form = z.infer<typeof step1Schema>

const step2Schema = z.object({
  orderNumber: z.string().min(1, 'Укажите номер поставки'),
  customerName: z.string().optional(),
  expectedAt: z.string().optional(),
  notes: z.string().optional(),
})
type Step2Form = z.infer<typeof step2Schema>

const addItemSchema = z.object({
  productId: z.string().min(1, 'Выберите товар'),
  requestedQuantity: z.coerce.number().min(1),
})
type AddItemForm = z.infer<typeof addItemSchema>

export default function ReceivingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [order, setOrder] = useState<Order | null>(null)
  const [warehouseId, setWarehouseId] = useState('')

  const { data: warehouses } = useWarehouses()
  const warehouseList = Array.isArray(warehouses) ? warehouses : []
  const { data: products } = useProducts()
  const productList = Array.isArray(products) ? products : []
  const createOrder = useCreateOrder()
  const addItem = useAddOrderItem()
  const transitions = useOrderTransition()

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: { warehouseId: '' },
  })

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: { orderNumber: '' },
  })

  const addItemForm = useForm<AddItemForm>({
    resolver: zodResolver(addItemSchema),
    defaultValues: { requestedQuantity: 1 },
  })

  const onStep1 = (data: Step1Form) => {
    setWarehouseId(data.warehouseId)
    setStep(1)
  }

  const onStep2 = (data: Step2Form) => {
    createOrder.mutate(
      {
        warehouseId,
        type: OrderType.INBOUND,
        ...data,
      },
      {
        onSuccess: (created) => {
          setOrder(created)
          setStep(2)
        },
      }
    )
  }

  const onAddItem = (data: AddItemForm) => {
    if (!order) return
    addItem.mutate(
      { orderId: order.id, ...data },
      {
        onSuccess: (newItem) => {
          setOrder((prev) =>
            prev ? { ...prev, items: [...prev.items, newItem as OrderItem] } : prev
          )
          addItemForm.reset({ requestedQuantity: 1 })
        },
      }
    )
  }

  const onScanBarcode = (barcode: string) => {
    const product = productList.find(
      (p) => p.barcode === barcode || p.sku === barcode
    )
    if (!product) {
      toast.error(`Товар не найден: ${barcode}`)
      return
    }
    if (!order) return
    addItem.mutate(
      { orderId: order.id, productId: product.id, requestedQuantity: 1 },
      {
        onSuccess: (newItem) => {
          setOrder((prev) =>
            prev ? { ...prev, items: [...prev.items, newItem as OrderItem] } : prev
          )
          toast.success(`Добавлен: ${product.name}`)
        },
      }
    )
  }

  const onConfirm = () => {
    if (!order) return
    transitions.confirm.mutate(order.id, {
      onSuccess: (confirmed) => {
        setOrder(confirmed)
        setStep(3)
      },
    })
  }

  const totalItems = order?.items.reduce((s, i) => s + i.requestedQuantity, 0) ?? 0

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary-500" />
          Приёмка товаров
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">Создание входящей поставки</p>
      </div>

      <Steps steps={STEPS} current={step} />

      {/* Step 0: Select Warehouse */}
      {step === 0 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900">Выберите склад для приёмки</h2>
          <form onSubmit={step1Form.handleSubmit(onStep1)} className="space-y-4">
            <Select
              label="Склад"
              required
              error={step1Form.formState.errors.warehouseId?.message}
              {...step1Form.register('warehouseId')}
            >
              <option value="">— Выберите склад —</option>
              {warehouseList.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
            <div className="flex justify-end">
              <Button type="submit">
                Далее <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 1: Order Details */}
      {step === 1 && (
        <Card className="p-6 space-y-4">
          <h2 className="font-semibold text-neutral-900">Данные поставки</h2>
          <form onSubmit={step2Form.handleSubmit(onStep2)} className="space-y-4">
            <Input
              label="Номер поставки / накладной"
              placeholder="PN-2024-001"
              required
              error={step2Form.formState.errors.orderNumber?.message}
              {...step2Form.register('orderNumber')}
            />
            <Input
              label="Поставщик"
              placeholder="ООО Поставщик"
              {...step2Form.register('customerName')}
            />
            <Input
              label="Ожидаемая дата"
              type="datetime-local"
              {...step2Form.register('expectedAt')}
            />
            <Input
              label="Примечания"
              placeholder="Дополнительная информация..."
              {...step2Form.register('notes')}
            />
            <div className="flex justify-between">
              <Button variant="secondary" type="button" onClick={() => setStep(0)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Назад
              </Button>
              <Button type="submit" loading={createOrder.isPending}>
                Создать поставку <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2: Scan/Add Items */}
      {step === 2 && order && (
        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-neutral-900">Добавление товаров</h2>
              <Badge variant="pending">{order.orderNumber}</Badge>
            </div>

            <BarcodeScanner
              label="Сканер штрихкодов"
              onScan={onScanBarcode}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-neutral-400">или добавить вручную</span>
              </div>
            </div>

            <form onSubmit={addItemForm.handleSubmit(onAddItem)} className="flex gap-3">
              <div className="flex-1">
                <Select {...addItemForm.register('productId')}>
                  <option value="">— Выберите товар —</option>
                  {productList.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="1"
                  placeholder="Кол-во"
                  {...addItemForm.register('requestedQuantity')}
                />
              </div>
              <Button type="submit" variant="secondary" loading={addItem.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </form>
          </Card>

          {/* Items list */}
          {order.items.length > 0 && (
            <Card className="divide-y divide-neutral-100">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-neutral-400" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {item.product?.name ?? item.productId}
                      </p>
                      <p className="font-mono-sku text-xs text-neutral-400">{item.product?.sku}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-neutral-700">
                      {item.requestedQuantity} {item.product?.unit ?? 'шт'}
                    </span>
                  </div>
                </div>
              ))}
              <div className="px-4 py-3 bg-neutral-50 flex justify-between text-sm font-semibold text-neutral-900">
                <span>Итого позиций: {order.items.length}</span>
                <span>Итого единиц: {totalItems}</span>
              </div>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Назад
            </Button>
            <Button
              onClick={onConfirm}
              disabled={order.items.length === 0}
              loading={transitions.confirm.isPending}
            >
              Подтвердить поставку <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {step === 3 && order && (
        <Card className="p-8 text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-success-500 mx-auto" />
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Поставка подтверждена!</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {order.orderNumber} · {order.items.length} позиций · {totalItems} единиц
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setStep(0)
                setOrder(null)
                step1Form.reset()
                step2Form.reset()
              }}
            >
              Новая поставка
            </Button>
            <Button onClick={() => router.push(`/orders/${order.id}`)}>
              Открыть заказ
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
