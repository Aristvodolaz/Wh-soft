'use client'

import { useState } from 'react'
import { useProducts, useCreateProduct } from '@/features/inventory/api/use-inventory'
import { ProductTable } from '@/widgets/inventory/product-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Drawer } from '@/shared/ui/drawer'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import type { Product } from '@/entities/inventory/types'
import { ProductUnit } from '@/entities/inventory/types'
import { Badge } from '@/shared/ui/badge'
import { formatDate } from '@/shared/lib/format'

const createSchema = z.object({
  sku: z.string().min(1, 'Обязательное поле').max(100),
  name: z.string().min(1, 'Обязательное поле').max(255),
  description: z.string().optional(),
  barcode: z.string().optional(),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.PIECE),
  minStockLevel: z.coerce.number().min(0).optional(),
  maxStockLevel: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
})

type CreateForm = z.infer<typeof createSchema>

export default function ProductsPage() {
  const { data: products, isLoading } = useProducts()
  const createProduct = useCreateProduct()
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const onSubmit = (data: CreateForm) => {
    createProduct.mutate(data, {
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
          <h1 className="text-2xl font-bold text-neutral-900">Товары</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {products?.length ?? 0} товаров в каталоге
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить товар
        </Button>
      </div>

      <ProductTable
        products={products}
        loading={isLoading}
        onSelect={setSelected}
      />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый товар" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              placeholder="MILK-001"
              error={errors.sku?.message}
              required
              {...register('sku')}
            />
            <Select label="Единица измерения" {...register('unit')}>
              {Object.values(ProductUnit).map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </Select>
          </div>
          <Input
            label="Название"
            placeholder="Молоко 3.2% 1л"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input label="Штрихкод" placeholder="4607100931867" {...register('barcode')} />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Мин. остаток" type="number" {...register('minStockLevel')} />
            <Input label="Макс. остаток" type="number" {...register('maxStockLevel')} />
            <Input label="Вес (кг)" type="number" step="0.001" {...register('weight')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={createProduct.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Detail Drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
      >
        {selected && (
          <div className="p-6 space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">SKU</p>
              <p className="font-mono-sku font-medium">{selected.sku}</p>
            </div>
            {selected.barcode && (
              <div className="space-y-1">
                <p className="text-xs text-neutral-400">Штрихкод</p>
                <p className="font-mono-sku">{selected.barcode}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-neutral-400">Единица</p>
                <p className="text-sm font-medium">{selected.unit}</p>
              </div>
              {selected.weight != null && (
                <div>
                  <p className="text-xs text-neutral-400">Вес</p>
                  <p className="text-sm font-medium">{selected.weight} кг</p>
                </div>
              )}
            </div>
            {(selected.minStockLevel != null || selected.maxStockLevel != null) && (
              <div className="grid grid-cols-2 gap-4">
                {selected.minStockLevel != null && (
                  <div>
                    <p className="text-xs text-neutral-400">Мин. остаток</p>
                    <p className="text-sm font-medium">{selected.minStockLevel}</p>
                  </div>
                )}
                {selected.maxStockLevel != null && (
                  <div>
                    <p className="text-xs text-neutral-400">Макс. остаток</p>
                    <p className="text-sm font-medium">{selected.maxStockLevel}</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">Статус</p>
              <Badge variant={selected.isActive ? 'active' : 'cancelled'}>
                {selected.isActive ? 'Активен' : 'Неактивен'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-neutral-400">Создан</p>
              <p className="text-sm">{formatDate(selected.createdAt)}</p>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
