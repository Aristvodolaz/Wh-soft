'use client'

import { useState, useMemo } from 'react'
import { useInventory, useMoveInventory } from '@/features/inventory/api/use-inventory'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { MovementHistory } from '@/widgets/inventory/movement-history'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select } from '@/shared/ui/select'
import { Badge } from '@/shared/ui/badge'
import { Card } from '@/shared/ui/card'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { MovementType } from '@/entities/inventory/types'
import type { InventoryItem } from '@/entities/inventory/types'
import { ClipboardCheck, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

interface AuditRow {
  item: InventoryItem
  physicalCount: string   // raw input string
  adjusted: boolean
}

export default function InventoryAuditPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()
  const { data: items, isLoading, refetch } = useInventory(selectedWarehouseId ?? '')
  const moveInventory = useMoveInventory()

  // Local audit state: map itemId → row
  const [auditMap, setAuditMap] = useState<Record<string, AuditRow>>({})
  const [submitting, setSubmitting] = useState(false)

  // Build current audit rows by merging server data with local counts
  const rows = useMemo<AuditRow[]>(() => {
    if (!items) return []
    return items.map((item) => auditMap[item.id] ?? {
      item,
      physicalCount: String(item.quantity),
      adjusted: false,
    })
  }, [items, auditMap])

  const discrepancies = rows.filter((r) => {
    const phys = Number(r.physicalCount)
    return !isNaN(phys) && phys !== r.item.quantity && !r.adjusted
  })

  const setPhysicalCount = (itemId: string, value: string) => {
    setAuditMap((prev) => ({
      ...prev,
      [itemId]: {
        item: prev[itemId]?.item ?? items!.find((i) => i.id === itemId)!,
        physicalCount: value,
        adjusted: false,
      },
    }))
  }

  const applyAdjustments = async () => {
    if (!selectedWarehouseId) return
    const toAdjust = discrepancies.filter((r) => !isNaN(Number(r.physicalCount)))
    if (!toAdjust.length) {
      toast('Нет расхождений для корректировки', { icon: '✅' })
      return
    }

    setSubmitting(true)
    let successCount = 0
    let errorCount = 0

    for (const row of toAdjust) {
      const delta = Number(row.physicalCount) - row.item.quantity
      if (delta === 0) continue
      try {
        await moveInventory.mutateAsync({
          inventoryItemId: row.item.id,
          warehouseId: selectedWarehouseId,
          fromCellId: row.item.cellId,
          toCellId: row.item.cellId,
          type: MovementType.ADJUSTMENT,
          quantity: Math.abs(delta),
          notes: `Инвентаризация: ${row.item.quantity} → ${row.physicalCount}`,
        })
        // Mark as adjusted
        setAuditMap((prev) => ({
          ...prev,
          [row.item.id]: { ...prev[row.item.id], adjusted: true },
        }))
        successCount++
      } catch {
        errorCount++
      }
    }

    setSubmitting(false)

    if (errorCount === 0) {
      toast.success(`Скорректировано позиций: ${successCount}`)
    } else {
      toast.error(`Ошибок: ${errorCount}, успешно: ${successCount}`)
    }
    refetch()
  }

  const resetAudit = () => {
    setAuditMap({})
    toast('Данные инвентаризации сброшены', { icon: '🔄' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary-600" />
            Инвентаризация
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Сверьте фактические остатки и примените корректировки
          </p>
        </div>
        <div className="flex items-center gap-3">
          {warehouses && warehouses.length > 0 && (
            <Select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-48"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}
          <Button variant="secondary" size="sm" onClick={resetAudit}>
            <RefreshCw className="h-4 w-4" />
            Сбросить
          </Button>
          {discrepancies.length > 0 && (
            <Button onClick={applyAdjustments} loading={submitting}>
              <CheckCircle2 className="h-4 w-4" />
              Применить корректировки ({discrepancies.length})
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
            <ClipboardCheck className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{rows.length}</p>
            <p className="text-xs text-neutral-500">Позиций всего</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">{discrepancies.length}</p>
            <p className="text-xs text-neutral-500">Расхождений</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-success-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-success-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-neutral-900">
              {rows.filter((r) => r.adjusted).length}
            </p>
            <p className="text-xs text-neutral-500">Скорректировано</p>
          </div>
        </Card>
      </div>

      {/* Audit table */}
      <Card>
        <div className="px-4 py-3 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-700">Список позиций</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Введите фактическое количество. Расхождения подсвечиваются автоматически.
          </p>
        </div>

        {!selectedWarehouseId ? (
          <EmptyState title="Выберите склад" description="Выберите склад для начала инвентаризации" />
        ) : isLoading ? (
          <TableSkeleton rows={10} cols={5} />
        ) : !rows.length ? (
          <EmptyState title="Нет остатков" description="В выбранном складе нет товаров на остатках" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Товар</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-500 uppercase tracking-wide">Ячейка</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Систем.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Факт.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-500 uppercase tracking-wide">Δ</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-500 uppercase tracking-wide">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {rows.map((row) => {
                  const phys = Number(row.physicalCount)
                  const valid = !isNaN(phys) && row.physicalCount !== ''
                  const delta = valid ? phys - row.item.quantity : null
                  const hasDiscrepancy = delta !== null && delta !== 0

                  return (
                    <tr
                      key={row.item.id}
                      className={[
                        'hover:bg-neutral-50 transition-colors',
                        row.adjusted ? 'bg-success-50/40' : hasDiscrepancy ? 'bg-warning-50/40' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-neutral-800">
                          {row.item.product?.name ?? row.item.productId}
                        </p>
                        <p className="text-xs text-neutral-400 font-mono">
                          {row.item.product?.sku ?? ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                          {row.item.cellId ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-neutral-700">
                        {row.item.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.physicalCount}
                          onChange={(e) => setPhysicalCount(row.item.id, e.target.value)}
                          disabled={row.adjusted}
                          className={[
                            'w-20 text-right text-sm font-medium border rounded px-2 py-1 focus:outline-none focus:ring-2',
                            row.adjusted
                              ? 'bg-neutral-50 text-neutral-400 border-neutral-100 cursor-not-allowed'
                              : hasDiscrepancy
                              ? 'border-warning-300 focus:ring-warning-300 bg-warning-50'
                              : 'border-neutral-200 focus:ring-primary-300',
                          ].join(' ')}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {delta !== null && delta !== 0 && (
                          <span className={`font-bold text-sm ${delta > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        )}
                        {delta === 0 && (
                          <span className="text-neutral-300 text-sm">0</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {row.adjusted ? (
                          <Badge variant="active">Скорр.</Badge>
                        ) : hasDiscrepancy ? (
                          <Badge variant="failed">Расх.</Badge>
                        ) : (
                          <Badge variant="completed">ОК</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Movement history below audit table */}
      {selectedWarehouseId && (
        <MovementHistory
          warehouseId={selectedWarehouseId}
          limit={30}
          title="Последние корректировки"
        />
      )}
    </div>
  )
}
