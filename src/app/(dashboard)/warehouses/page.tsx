'use client'

import { useState } from 'react'
import { useWarehouses, useCreateWarehouse } from '@/features/warehouses/api/use-warehouses'
import { WarehouseTable } from '@/widgets/warehouse/warehouse-table'
import { Button } from '@/shared/ui/button'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus } from 'lucide-react'

const createSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/, 'Только заглавные буквы, цифры, - и _'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().default('UTC'),
})

type CreateForm = z.infer<typeof createSchema>

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const [createOpen, setCreateOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) })

  const onSubmit = (data: CreateForm) => {
    createWarehouse.mutate(data, {
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

      <WarehouseTable warehouses={warehouses} loading={isLoading} />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Новый склад">
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <Input
            label="Название"
            placeholder="Склад Москва"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          <Input
            label="Код"
            placeholder="MSK-01"
            error={errors.code?.message}
            required
            {...register('code')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Город" placeholder="Москва" {...register('city')} />
            <Input label="Страна" placeholder="Россия" {...register('country')} />
          </div>
          <Input label="Адрес" placeholder="ул. Примерная, 1" {...register('address')} />
          <Input label="Timezone" placeholder="Europe/Moscow" {...register('timezone')} />
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
    </div>
  )
}
