'use client'

import { Table } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card } from '@/shared/ui/card'
import type { Warehouse } from '@/entities/warehouse/types'
import { formatDate } from '@/shared/lib/format'
import { Eye, Pencil } from 'lucide-react'
import Link from 'next/link'

interface WarehouseTableProps {
  warehouses?: Warehouse[]
  loading?: boolean
  onEdit?: (warehouse: Warehouse) => void
}

export function WarehouseTable({ warehouses = [], loading, onEdit }: WarehouseTableProps) {
  const columns = [
    {
      key: 'name' as const,
      header: 'Название',
      render: (row: Warehouse) => (
        <div>
          <p className="font-medium text-neutral-900">{row.name}</p>
          <p className="text-xs font-mono-sku text-neutral-400">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'city' as const,
      header: 'Город',
      render: (row: Warehouse) => row.city || '—',
    },
    {
      key: 'timezone' as const,
      header: 'Timezone',
      render: (row: Warehouse) => (
        <span className="font-mono-sku text-sm">{row.timezone}</span>
      ),
    },
    {
      key: 'isActive' as const,
      header: 'Статус',
      render: (row: Warehouse) => (
        <Badge variant={row.isActive ? 'active' : 'cancelled'}>
          {row.isActive ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
    {
      key: 'createdAt' as const,
      header: 'Создан',
      render: (row: Warehouse) => formatDate(row.createdAt),
    },
    {
      key: 'id' as const,
      header: 'Действия',
      render: (row: Warehouse) => (
        <div className="flex items-center gap-1">
          <Link href={`/warehouses/${row.id}`}>
            <Button variant="ghost" size="icon-sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon-sm" onClick={() => onEdit?.(row)}>
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <Card>
        <TableSkeleton rows={5} cols={6} />
      </Card>
    )
  }

  if (!warehouses.length) {
    return (
      <EmptyState
        title="Нет складов"
        description="Создайте первый склад для начала работы"
      />
    )
  }

  return (
    <Card>
      <Table
        columns={columns}
        data={warehouses}
        keyExtractor={(w) => w.id}
      />
    </Card>
  )
}
