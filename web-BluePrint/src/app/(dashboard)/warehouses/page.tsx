'use client'

import { useState } from 'react'
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
} from '@/features/warehouses/api/use-warehouses'
import { WarehouseTable } from '@/widgets/warehouse/warehouse-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'
import type { Warehouse } from '@/entities/warehouse/types'

const warehouseSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/, 'Только заглавные буквы, цифры, - и _'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().default('UTC'),
  isActive: z.boolean().optional(),
})

type WarehouseForm = z.infer<typeof warehouseSchema>

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null)

  const createForm = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { timezone: 'UTC' },
  })

  const editForm = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema),
  })

  const openEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse)
    editForm.reset({
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address ?? '',
      city: warehouse.city ?? '',
      country: warehouse.country ?? '',
      timezone: warehouse.timezone ?? 'UTC',
      isActive: warehouse.isActive,
    })
    setEditOpen(true)
  }

  const closeEdit = () => {
    setEditOpen(false)
    setEditingWarehouse(null)
    editForm.reset()
  }

  const onCreate = (data: WarehouseForm) => {
    const { isActive: _, ...payload } = data
    createWarehouse.mutate(payload, {
      onSuccess: () => {
        setCreateOpen(false)
        createForm.reset({ timezone: 'UTC' })
      },
    })
  }

  const onUpdate = (data: WarehouseForm) => {
    if (!editingWarehouse) return
    updateWarehouse.mutate(
      {
        id: editingWarehouse.id,
        name: data.name.trim(),
        code: data.code.trim().toUpperCase(),
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        country: data.country?.trim() || undefined,
        timezone: data.timezone?.trim() || 'UTC',
        isActive: Boolean(data.isActive),
      },
      { onSuccess: closeEdit },
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Склады</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {warehouses?.length ?? 0} складов в системе
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Добавить склад
        </Button>
      </div>

      <WarehouseTable
        warehouses={warehouses}
        loading={isLoading}
        onEdit={openEdit}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый склад">
        <form onSubmit={createForm.handleSubmit(onCreate)} className="p-6 space-y-4">
          <Input
            label="Название"
            placeholder="Склад Москва"
            error={createForm.formState.errors.name?.message}
            required
            {...createForm.register('name')}
          />
          <Input
            label="Код"
            placeholder="MSK-01"
            error={createForm.formState.errors.code?.message}
            required
            {...createForm.register('code')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Город" placeholder="Москва" {...createForm.register('city')} />
            <Input label="Страна" placeholder="Россия" {...createForm.register('country')} />
          </div>
          <Input label="Адрес" placeholder="ул. Примерная, 1" {...createForm.register('address')} />
          <Input label="Timezone" placeholder="Europe/Moscow" {...createForm.register('timezone')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" loading={createWarehouse.isPending}>
              Создать
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editOpen} onClose={closeEdit} title="Редактировать склад">
        <form onSubmit={editForm.handleSubmit(onUpdate)} className="p-6 space-y-4">
          <Input
            label="Название"
            error={editForm.formState.errors.name?.message}
            required
            {...editForm.register('name')}
          />
          <Input
            label="Код"
            error={editForm.formState.errors.code?.message}
            required
            {...editForm.register('code')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Город" {...editForm.register('city')} />
            <Input label="Страна" {...editForm.register('country')} />
          </div>
          <Input label="Адрес" {...editForm.register('address')} />
          <Input label="Timezone" placeholder="Europe/Moscow" {...editForm.register('timezone')} />
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="rounded border-neutral-300"
              {...editForm.register('isActive', { setValueAs: (v) => v === true || v === 'true' || v === 'on' })}
            />
            Склад активен
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={closeEdit}>
              Отмена
            </Button>
            <Button type="submit" loading={updateWarehouse.isPending}>
              Сохранить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
