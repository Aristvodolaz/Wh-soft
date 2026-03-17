'use client'

import { use, useState } from 'react'
import {
  useWarehouse, useZones, useCreateZone, useBulkCreateCells,
} from '@/features/warehouses/api/use-warehouses'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Modal } from '@/shared/ui/modal'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { ZoneType } from '@/entities/warehouse/types'
import type { Zone } from '@/entities/warehouse/types'
import Link from 'next/link'
import { MapPin, Globe, Plus, Layers } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  [ZoneType.STORAGE]: 'Хранение',
  [ZoneType.RECEIVING]: 'Приёмка',
  [ZoneType.SHIPPING]: 'Отгрузка',
  [ZoneType.QUARANTINE]: 'Карантин',
  [ZoneType.PICKING]: 'Сборка',
  [ZoneType.PACKING]: 'Упаковка',
}

const createZoneSchema = z.object({
  name: z.string().min(1, 'Обязательное поле'),
  code: z.string().min(1).regex(/^[A-Z0-9_-]+$/, 'Только заглавные буквы, цифры, - и _'),
  type: z.nativeEnum(ZoneType),
  description: z.string().optional(),
})
type CreateZoneForm = z.infer<typeof createZoneSchema>

const bulkCellsSchema = z.object({
  template: z.string().min(1, 'Обязательное поле').default('A-{row}-{rack}-{shelf}'),
  rows: z.coerce.number().min(1).max(100),
  racks: z.coerce.number().min(1).max(100),
  shelves: z.coerce.number().min(1).max(50),
  
})
type BulkCellsForm = z.infer<typeof bulkCellsSchema>

export default function WarehousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: warehouse, isLoading: wLoading } = useWarehouse(id)
  const { data: zones, isLoading: zLoading } = useZones(id)
  const createZone = useCreateZone()
  const bulkCreateCells = useBulkCreateCells()

  const [zoneOpen, setZoneOpen] = useState(false)
  const [cellsOpen, setCellsOpen] = useState<Zone | null>(null)

  const zoneForm = useForm<CreateZoneForm>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: { type: ZoneType.STORAGE },
  })

  const cellsForm = useForm<BulkCellsForm>({
    resolver: zodResolver(bulkCellsSchema),
    defaultValues: { template: 'A-{row}-{rack}-{shelf}', rows: 10, racks: 6, shelves: 4 },
  })

  const onCreateZone = (data: CreateZoneForm) => {
    createZone.mutate({ warehouseId: id, ...data }, {
      onSuccess: () => { setZoneOpen(false); zoneForm.reset() },
    })
  }

  const onBulkCells = (data: BulkCellsForm) => {
    if (!cellsOpen) return
    // Generate cells array from template
    const cells: { code: string }[] = []
    for (let row = 1; row <= data.rows; row++) {
      for (let rack = 1; rack <= data.racks; rack++) {
        for (let shelf = 1; shelf <= data.shelves; shelf++) {
          const code = data.template
            .replace('{row}', String(row).padStart(2, '0'))
            .replace('{rack}', String(rack).padStart(2, '0'))
            .replace('{shelf}', String(shelf).padStart(2, '0'))
          cells.push({ code })
        }
      }
    }
    bulkCreateCells.mutate(
      { warehouseId: id, zoneId: cellsOpen.id, cells },
      { onSuccess: () => { setCellsOpen(null); cellsForm.reset() } },
    )
  }

  if (wLoading) return <FullPageSpinner />
  if (!warehouse) return <div className="p-6"><EmptyState title="Склад не найден" /></div>

  const totalCells = cellsForm.watch('rows') * cellsForm.watch('racks') * cellsForm.watch('shelves')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/warehouses" className="hover:text-neutral-700">Склады</Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{warehouse.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900">{warehouse.name}</h1>
            <Badge variant={warehouse.isActive ? 'active' : 'cancelled'}>
              {warehouse.isActive ? 'Активен' : 'Неактивен'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {warehouse.city && (
              <div className="flex items-center gap-1 text-sm text-neutral-500">
                <MapPin className="h-4 w-4" />
                {warehouse.city}{warehouse.country && `, ${warehouse.country}`}
              </div>
            )}
            <div className="flex items-center gap-1 text-sm text-neutral-500">
              <Globe className="h-4 w-4" />
              {warehouse.timezone}
            </div>
            <span className="font-mono-sku text-sm text-neutral-400">{warehouse.code}</span>
          </div>
        </div>
      </div>

      {/* Zones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            Зоны склада {!zLoading && zones && `(${zones.length})`}
          </h2>
          <Button size="sm" onClick={() => setZoneOpen(true)}>
            <Plus className="h-4 w-4" />
            Добавить зону
          </Button>
        </div>

        {zLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="skeleton h-5 w-24 rounded mb-2" />
                <div className="skeleton h-4 w-16 rounded" />
              </Card>
            ))}
          </div>
        ) : !zones?.length ? (
          <EmptyState title="Нет зон" description="Добавьте зоны для организации склада" />
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {zones.map((zone) => (
              <Card key={zone.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900">{zone.name}</h3>
                  <Badge variant={zone.isActive ? 'active' : 'cancelled'} dot={false}>
                    {ZONE_TYPE_LABELS[zone.type] ?? zone.type}
                  </Badge>
                </div>
                <p className="font-mono-sku text-sm text-neutral-400 mb-3">{zone.code}</p>
                {zone.description && (
                  <p className="text-sm text-neutral-500 mb-3">{zone.description}</p>
                )}
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => { setCellsOpen(zone); cellsForm.reset() }}
                >
                  <Layers className="h-3 w-3" />
                  Создать ячейки
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Zone Modal */}
      <Modal open={zoneOpen} onClose={() => setZoneOpen(false)} title="Новая зона">
        <form onSubmit={zoneForm.handleSubmit(onCreateZone)} className="p-6 space-y-4">
          <Input
            label="Название"
            placeholder="Зона хранения A"
            error={zoneForm.formState.errors.name?.message}
            required
            {...zoneForm.register('name')}
          />
          <Input
            label="Код"
            placeholder="ZONE-A"
            error={zoneForm.formState.errors.code?.message}
            required
            {...zoneForm.register('code')}
          />
          <Select label="Тип зоны" {...zoneForm.register('type')}>
            {Object.values(ZoneType).map((t) => (
              <option key={t} value={t}>{ZONE_TYPE_LABELS[t]}</option>
            ))}
          </Select>
          <Input label="Описание" placeholder="Описание зоны..." {...zoneForm.register('description')} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setZoneOpen(false)}>Отмена</Button>
            <Button type="submit" loading={createZone.isPending}>Создать</Button>
          </div>
        </form>
      </Modal>

      {/* Bulk Create Cells Modal */}
      <Modal
        open={!!cellsOpen}
        onClose={() => setCellsOpen(null)}
        title={`Создать ячейки — ${cellsOpen?.name ?? ''}`}
      >
        <form onSubmit={cellsForm.handleSubmit(onBulkCells)} className="p-6 space-y-4">
          <Input
            label="Шаблон кода"
            placeholder="A-{row}-{rack}-{shelf}"
            helperText="Доступные переменные: {row}, {rack}, {shelf}"
            error={cellsForm.formState.errors.template?.message}
            {...cellsForm.register('template')}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Рядов"
              type="number"
              min="1"
              max="100"
              error={cellsForm.formState.errors.rows?.message}
              {...cellsForm.register('rows')}
            />
            <Input
              label="Стеллажей"
              type="number"
              min="1"
              max="100"
              error={cellsForm.formState.errors.racks?.message}
              {...cellsForm.register('racks')}
            />
            <Input
              label="Полок"
              type="number"
              min="1"
              max="50"
              error={cellsForm.formState.errors.shelves?.message}
              {...cellsForm.register('shelves')}
            />
          </div>
          <p className="text-sm text-neutral-500">
            Будет создано: <span className="font-semibold text-neutral-900">{totalCells}</span> ячеек
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setCellsOpen(null)}>Отмена</Button>
            <Button type="submit" loading={bulkCreateCells.isPending}>
              Создать {totalCells} ячеек
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
