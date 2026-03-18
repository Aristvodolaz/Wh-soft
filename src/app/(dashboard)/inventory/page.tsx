'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useInventory, useMoveInventory } from '@/features/inventory/api/use-inventory'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { Card } from '@/shared/ui/card'
import { Table } from '@/shared/ui/table'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Modal } from '@/shared/ui/modal'
import { Select } from '@/shared/ui/select'
import { SearchInput } from '@/shared/ui/search-input'
import type { InventoryItem } from '@/entities/inventory/types'
import { MovementType } from '@/entities/inventory/types'
import { AlertTriangle, ArrowLeftRight, Barcode, ClipboardCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { ScanDialog } from '@/widgets/inventory/scan-dialog'
import { MovementHistory } from '@/widgets/inventory/movement-history'

const moveSchema = z.object({
  inventoryItemId: z.string().min(1, 'Укажите позицию'),
  fromCellId: z.string().optional(),
  toCellId: z.string().optional(),
  type: z.nativeEnum(MovementType).default(MovementType.TRANSFER),
  quantity: z.coerce.number().min(1),
  notes: z.string().optional(),
})
type MoveForm = z.infer<typeof moveSchema>

export default function InventoryPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()
  const [search, setSearch] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)

  const moveInventory = useMoveInventory()

  const moveForm = useForm<MoveForm>({
    resolver: zodResolver(moveSchema),
    defaultValues: { quantity: 1, type: MovementType.TRANSFER },
  })

  useEffect(() => {
    if (!selectedWarehouseId && warehouses?.length) {
      setWarehouse(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId, setWarehouse])

  const warehouseId = selectedWarehouseId ?? ''
  const { data: items, isLoading } = useInventory(warehouseId)

  const filtered = (items ?? []).filter((item) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      item.product?.name?.toLowerCase().includes(q) ||
      item.product?.sku?.toLowerCase().includes(q) ||
      item.cellId?.toLowerCase().includes(q) ||
      false
    )
  })

  const onMove = (data: MoveForm) => {
    moveInventory.mutate(
      { ...data, warehouseId },
      { onSuccess: () => { setMoveOpen(false); moveForm.reset(); setSelectedItem(null) } },
    )
  }

  const openMoveForItem = (item: InventoryItem) => {
    setSelectedItem(item)
    moveForm.setValue('inventoryItemId', item.id)
    moveForm.setValue('fromCellId', item.cellId ?? '')
    setMoveOpen(true)
  }

  const columns = [
    {
      key: 'productId' as const,
      header: 'Товар',
      render: (row: InventoryItem) => (
        <div>
          <p className="font-medium text-neutral-900">{row.product?.name ?? row.productId}</p>
          {row.product?.sku && (
            <p className="text-xs font-mono-sku text-neutral-400">{row.product.sku}</p>
          )}
        </div>
      ),
    },
    {
      key: 'cellId' as const,
      header: 'Ячейка',
      render: (row: InventoryItem) => (
        <span className="font-mono-sku text-sm">{row.cellId ?? '—'}</span>
      ),
    },
    {
      key: 'quantity' as const,
      header: 'Кол-во',
      render: (row: InventoryItem) => <span className="font-semibold">{row.quantity}</span>,
    },
    {
      key: 'reservedQuantity' as const,
      header: 'Резерв',
      render: (row: InventoryItem) => (
        <span className="text-warning-600">{row.reservedQuantity}</span>
      ),
    },
    {
      key: 'availableQuantity' as const,
      header: 'Доступно',
      render: (row: InventoryItem) => (
        <div className="flex items-center gap-1.5">
          {row.availableQuantity === 0 && (
            <AlertTriangle className="h-3.5 w-3.5 text-danger-500" />
          )}
          <span className={row.availableQuantity === 0 ? 'text-danger-600 font-medium' : ''}>
            {row.availableQuantity}
          </span>
        </div>
      ),
    },
    {
      key: 'expiryDate' as const,
      header: 'Срок',
      render: (row: InventoryItem) =>
        row.expiryDate ? (
          <span className="text-sm text-neutral-500">
            {new Date(row.expiryDate).toLocaleDateString('ru-RU')}
          </span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
    {
      key: 'id' as const,
      header: '',
      className: 'w-10',
      render: (row: InventoryItem) => (
        <Button variant="ghost" size="icon-sm" onClick={() => openMoveForItem(row)}>
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Остатки</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {filtered.length} позиций на складе
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/inventory/audit"
            className="inline-flex items-center gap-1.5 h-8 px-3 text-sm font-medium rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <ClipboardCheck className="h-4 w-4" />
            Инвентаризация
          </Link>
          <Button variant="secondary" size="sm" onClick={() => setScanOpen(true)}>
            <Barcode className="h-4 w-4" />
            Сканировать
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setMoveOpen(true)}>
            <ArrowLeftRight className="h-4 w-4" />
            Переместить
          </Button>
          {warehouses && warehouses.length > 0 && (
            <Select
              value={selectedWarehouseId ?? ''}
              onChange={(e) => setWarehouse(e.target.value)}
              className="w-52"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-neutral-100">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Поиск по товару, SKU, ячейке..."
            className="max-w-sm"
          />
        </div>
        {isLoading ? (
          <TableSkeleton rows={10} cols={7} />
        ) : !filtered.length ? (
          <EmptyState title="Нет остатков" description="На выбранном складе нет товаров" />
        ) : (
          <Table columns={columns} data={filtered} keyExtractor={(i) => i.id} />
        )}
      </Card>

      {/* Scan barcode dialog (full API integration) */}
      <ScanDialog
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onSelectItem={(itemId) => {
          setMoveOpen(true)
          moveForm.setValue('inventoryItemId', itemId)
        }}
      />

      {/* Movement history */}
      {warehouseId && (
        <MovementHistory warehouseId={warehouseId} limit={20} title="Последние движения" />
      )}

      {/* Move inventory modal */}
      <Modal
        open={moveOpen}
        onClose={() => { setMoveOpen(false); moveForm.reset(); setSelectedItem(null) }}
        title="Перемещение товара"
      >
        <form onSubmit={moveForm.handleSubmit(onMove)} className="p-6 space-y-4">
          <Input
            label="ID позиции склада"
            placeholder="UUID позиции"
            error={moveForm.formState.errors.inventoryItemId?.message}
            required
            {...moveForm.register('inventoryItemId')}
          />
          <Input
            label="Ячейка-источник"
            placeholder="A-01-03-02"
            {...moveForm.register('fromCellId')}
          />
          <Input
            label="Ячейка-назначение"
            placeholder="B-02-01-01"
            {...moveForm.register('toCellId')}
          />
          <Select label="Тип перемещения" {...moveForm.register('type')}>
            {Object.values(MovementType).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
          <Input
            label="Количество"
            type="number"
            min="1"
            error={moveForm.formState.errors.quantity?.message}
            required
            {...moveForm.register('quantity')}
          />
          <Input
            label="Примечание"
            placeholder="Причина перемещения..."
            {...moveForm.register('notes')}
          />
          {selectedItem && (
            <p className="text-xs text-neutral-500">
              Доступно: <span className="font-semibold">{selectedItem.availableQuantity}</span> ед.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => { setMoveOpen(false); moveForm.reset(); setSelectedItem(null) }}>
              Отмена
            </Button>
            <Button type="submit" loading={moveInventory.isPending}>
              Переместить
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
