'use client'

import type { Zone } from '@/entities/warehouse/types'
import { ZoneType } from '@/entities/warehouse/types'
import { cn } from '@/shared/lib/cn'
import { Card, CardHeader, CardContent } from '@/shared/ui/card'

interface ZoneHeatmapProps {
  zones: Zone[]
}

// Mock utilization per zone type (in a real app this would come from the utilization API per zone)
function mockUtilization(type: ZoneType): number {
  const seed: Record<ZoneType, number> = {
    [ZoneType.STORAGE]: 78,
    [ZoneType.RECEIVING]: 45,
    [ZoneType.SHIPPING]: 62,
    [ZoneType.QUARANTINE]: 20,
    [ZoneType.PICKING]: 89,
    [ZoneType.PACKING]: 55,
  }
  return seed[type] ?? 50
}

function utilizationColor(pct: number): string {
  if (pct >= 85) return 'bg-danger-400 border-danger-500'
  if (pct >= 70) return 'bg-warning-400 border-warning-500'
  if (pct >= 40) return 'bg-success-400 border-success-500'
  return 'bg-primary-200 border-primary-300'
}

function utilizationTextColor(pct: number): string {
  if (pct >= 85) return 'text-danger-800'
  if (pct >= 70) return 'text-warning-800'
  if (pct >= 40) return 'text-success-800'
  return 'text-primary-700'
}

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  [ZoneType.STORAGE]: 'Хранение',
  [ZoneType.RECEIVING]: 'Приёмка',
  [ZoneType.SHIPPING]: 'Отгрузка',
  [ZoneType.QUARANTINE]: 'Карантин',
  [ZoneType.PICKING]: 'Сборка',
  [ZoneType.PACKING]: 'Упаковка',
}

export function ZoneHeatmap({ zones }: ZoneHeatmapProps) {
  if (zones.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Тепловая карта зон</h3>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary-200 inline-block" />{'<'}40%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-success-400 inline-block" />40–70%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-warning-400 inline-block" />70–85%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-danger-400 inline-block" />{'>'}85%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(zones.length, 4)}, 1fr)` }}>
          {zones.map((zone) => {
            const pct = mockUtilization(zone.type)
            return (
              <div
                key={zone.id}
                className={cn(
                  'rounded-lg border-2 p-4 transition-all hover:scale-105 cursor-default',
                  utilizationColor(pct)
                )}
              >
                <div className="font-semibold text-sm text-neutral-900 truncate">{zone.name}</div>
                <div className="font-mono-sku text-xs text-neutral-600 mb-2">{zone.code}</div>
                <div className="text-xs text-neutral-600 mb-2">{ZONE_TYPE_LABELS[zone.type]}</div>
                <div className={cn('text-2xl font-bold', utilizationTextColor(pct))}>{pct}%</div>
                <div className="mt-1 h-1.5 bg-white/40 rounded-full overflow-hidden">
                  <div className="h-full bg-white/70 rounded-full" style={{ width: pct + '%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
