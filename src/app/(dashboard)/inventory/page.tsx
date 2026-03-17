'use client'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { useInventory } from '@/features/inventory/api/use-inventory'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { Card } from '@/shared/ui/card'
import { Table } from '@/shared/ui/table'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'

import { Select } from '@/shared/ui/select'
import type { InventoryItem } from '@/entities/inventory/types'
import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function InventoryPage() {
  const { data: warehouses } = useWarehouses()
  const { selectedWarehouseId, setWarehouse } = useAuthStore()

  useEffect(() => {
    if (!selectedWarehouseId && warehouses?.length) {
      setWarehouse(warehouses[0].id)
    }
  }, [warehouses, selectedWarehouseId, setWarehouse])

  const warehouseId = selectedWarehouseId ?? ''
  const { data: items, isLoading } = useInventory(warehouseId)

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
      header: 'Количество',
      render: (row: InventoryItem) => (
        <span className="font-semibold">{row.quantity}</span>
      ),
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
      header: 'Срок годности',
      render: (row: InventoryItem) =>
        row.expiryDate ? (
          <span className="text-sm text-neutral-500">
            {new Date(row.expiryDate).toLocaleDateString('ru-RU')}
          </span>
        ) : (
          <span className="text-neutral-300">—</span>
        ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Остатки</h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            {items?.length ?? 0} позиций на складе
          </p>
        </div>
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

      <Card>
        {isLoading ? (
          <TableSkeleton rows={10} cols={6} />
        ) : !items?.length ? (
          <EmptyState title="Нет остатков" description="На выбранном складе нет товаров" />
        ) : (
          <Table
            columns={columns}
            data={items}
            keyExtractor={(i) => i.id}
          />
        )}
      </Card>
    </div>
  )
}
