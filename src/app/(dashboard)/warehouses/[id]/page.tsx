'use client'

import { use } from 'react'
import { useWarehouse, useZones } from '@/features/warehouses/api/use-warehouses'
import { Badge } from '@/shared/ui/badge'
import { Card } from '@/shared/ui/card'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { EmptyState } from '@/shared/ui/empty-state'
import { ZoneType } from '@/entities/warehouse/types'
import Link from 'next/link'
import { MapPin, Globe } from 'lucide-react'

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  [ZoneType.STORAGE]: 'Хранение',
  [ZoneType.RECEIVING]: 'Приёмка',
  [ZoneType.SHIPPING]: 'Отгрузка',
  [ZoneType.QUARANTINE]: 'Карантин',
  [ZoneType.PICKING]: 'Сборка',
  [ZoneType.PACKING]: 'Упаковка',
}

export default function WarehousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: warehouse, isLoading: wLoading } = useWarehouse(id)
  const { data: zones, isLoading: zLoading } = useZones(id)

  if (wLoading) return <FullPageSpinner />

  if (!warehouse) {
    return (
      <div className="p-6">
        <EmptyState title="Склад не найден" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/warehouses" className="hover:text-neutral-700">Склады</Link>
        <span>/</span>
        <span className="text-neutral-900 font-medium">{warehouse.name}</span>
      </div>

      {/* Header */}
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
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">
          Зоны склада {!zLoading && zones && `(${zones.length})`}
        </h2>
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
                <p className="font-mono-sku text-sm text-neutral-400">{zone.code}</p>
                {zone.description && (
                  <p className="text-sm text-neutral-500 mt-1">{zone.description}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
