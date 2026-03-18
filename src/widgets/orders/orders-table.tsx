'use client'

import { useState } from 'react'
import { Table } from '@/shared/ui/table'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { TableSkeleton } from '@/shared/ui/skeleton'
import { EmptyState } from '@/shared/ui/empty-state'
import { Card } from '@/shared/ui/card'
import { Pagination } from '@/shared/ui/pagination'
import type { Order } from '@/entities/order/types'
import { OrderStatus, ORDER_STATUS_LABELS } from '@/entities/order/types'
import { formatDateTime } from '@/shared/lib/format'
import { Eye } from 'lucide-react'
import Link from 'next/link'

const STATUS_BADGE_VARIANTS: Record<OrderStatus, 'active' | 'pending' | 'in-progress' | 'completed' | 'cancelled' | 'draft'> = {
  [OrderStatus.DRAFT]: 'draft',
  [OrderStatus.CONFIRMED]: 'pending',
  [OrderStatus.IN_PICKING]: 'in-progress',
  [OrderStatus.PICKED]: 'in-progress',
  [OrderStatus.IN_PACKING]: 'in-progress',
  [OrderStatus.PACKED]: 'pending',
  [OrderStatus.SHIPPED]: 'active',
  [OrderStatus.DELIVERED]: 'completed',
  [OrderStatus.CANCELLED]: 'cancelled',
  [OrderStatus.RETURNED]: 'cancelled',
}

interface OrdersTableProps {
  orders?: Order[]
  loading?: boolean
}

const PAGE_SIZE = 25

export function OrdersTable({ orders = [], loading }: OrdersTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase()
    return (
      o.orderNumber?.toLowerCase().includes(q) ||
      o.customerName?.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q)
    )
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'orderNumber' as const,
      header: 'Заказ',
      render: (row: Order) => (
        <div>
          <p className="font-mono-sku font-medium text-neutral-900">
            {row.orderNumber || `#${row.id.slice(0, 8)}`}
          </p>
          {row.customerName && (
            <p className="text-xs text-neutral-400">{row.customerName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'type' as const,
      header: 'Тип',
      render: (row: Order) => (
        <span className="text-sm">
          {row.type === 'INBOUND' ? '↓ Входящий' : '↑ Исходящий'}
        </span>
      ),
    },
    {
      key: 'status' as const,
      header: 'Статус',
      render: (row: Order) => (
        <Badge variant={STATUS_BADGE_VARIANTS[row.status]}>
          {ORDER_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: 'priority' as const,
      header: 'Приоритет',
      render: (row: Order) => (
        <span className={row.priority >= 8 ? 'text-danger-600 font-medium' : 'text-neutral-500'}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'createdAt' as const,
      header: 'Создан',
      render: (row: Order) => (
        <span className="text-sm text-neutral-500">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: 'id' as const,
      header: '',
      className: 'w-16',
      render: (row: Order) => (
        <Link href={`/orders/${row.id}`}>
          <Button variant="ghost" size="icon-sm">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <Card>
      <div className="px-4 py-3 border-b border-neutral-100">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Поиск по номеру заказа, клиенту..."
          className="max-w-sm"
        />
      </div>
      {loading ? (
        <TableSkeleton rows={PAGE_SIZE} cols={6} />
      ) : !filtered.length ? (
        <EmptyState title="Заказы не найдены" />
      ) : (
        <>
          <Table
            columns={columns}
            data={paginated}
            keyExtractor={(o) => o.id}
          />
          <div className="border-t border-neutral-100">
            <Pagination
              page={page}
              total={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </div>
        </>
      )}
    </Card>
  )
}
