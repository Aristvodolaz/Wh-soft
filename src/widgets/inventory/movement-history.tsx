'use client'

import { useMovements } from '@/features/inventory/api/use-inventory'
import { Card } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { formatDateTime } from '@/shared/lib/format'
import { MovementType } from '@/entities/inventory/types'
import type { MovementResponse } from '@/entities/inventory/types'
import { ArrowRightLeft, PackagePlus, PackageMinus, RotateCcw, Trash2, SlidersHorizontal } from 'lucide-react'

const MOVEMENT_LABELS: Record<MovementType, string> = {
  [MovementType.TRANSFER]: 'Перемещение',
  [MovementType.RECEIVE]: 'Приёмка',
  [MovementType.DISPATCH]: 'Отгрузка',
  [MovementType.ADJUSTMENT]: 'Корректировка',
  [MovementType.RETURN]: 'Возврат',
  [MovementType.WRITE_OFF]: 'Списание',
}

const MOVEMENT_ICONS: Record<MovementType, React.ReactNode> = {
  [MovementType.TRANSFER]: <ArrowRightLeft className="h-3.5 w-3.5" />,
  [MovementType.RECEIVE]: <PackagePlus className="h-3.5 w-3.5" />,
  [MovementType.DISPATCH]: <PackageMinus className="h-3.5 w-3.5" />,
  [MovementType.ADJUSTMENT]: <SlidersHorizontal className="h-3.5 w-3.5" />,
  [MovementType.RETURN]: <RotateCcw className="h-3.5 w-3.5" />,
  [MovementType.WRITE_OFF]: <Trash2 className="h-3.5 w-3.5" />,
}

const MOVEMENT_VARIANT: Record<MovementType, 'active' | 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'failed' | 'draft'> = {
  [MovementType.TRANSFER]: 'in-progress',
  [MovementType.RECEIVE]: 'active',
  [MovementType.DISPATCH]: 'completed',
  [MovementType.ADJUSTMENT]: 'pending',
  [MovementType.RETURN]: 'draft',
  [MovementType.WRITE_OFF]: 'failed',
}

interface MovementHistoryProps {
  warehouseId: string
  inventoryItemId?: string
  limit?: number
  title?: string
}

export function MovementHistory({
  warehouseId,
  inventoryItemId,
  limit = 50,
  title = 'История движений',
}: MovementHistoryProps) {
  const { data: movements, isLoading } = useMovements(warehouseId, { inventoryItemId, limit })

  return (
    <Card>
      <div className="px-4 py-3 border-b border-neutral-100">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : !movements?.length ? (
        <EmptyState title="Движений нет" description="История операций с товарами появится здесь" />
      ) : (
        <div className="divide-y divide-neutral-50">
          {movements.map((m) => (
            <MovementRow key={m.id} movement={m} />
          ))}
        </div>
      )}
    </Card>
  )
}

function MovementRow({ movement: m }: { movement: MovementResponse }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 transition-colors">
      <Badge variant={MOVEMENT_VARIANT[m.type]} className="flex items-center gap-1 shrink-0">
        {MOVEMENT_ICONS[m.type]}
        {MOVEMENT_LABELS[m.type]}
      </Badge>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm text-neutral-700">
          {m.fromCellId && (
            <>
              <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{m.fromCellId}</span>
              <span className="text-neutral-400">→</span>
            </>
          )}
          {m.toCellId && (
            <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">{m.toCellId}</span>
          )}
          {!m.fromCellId && !m.toCellId && (
            <span className="text-neutral-400 text-xs">без ячейки</span>
          )}
        </div>
        {m.reference && (
          <p className="text-xs text-neutral-400 mt-0.5 truncate">{m.reference}</p>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-neutral-800">
          {m.type === MovementType.DISPATCH || m.type === MovementType.WRITE_OFF ? '-' : '+'}
          {m.quantity}
        </p>
        <p className="text-xs text-neutral-400">{formatDateTime(m.createdAt)}</p>
      </div>
    </div>
  )
}
