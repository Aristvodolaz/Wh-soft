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
import type { Product } from '@/entities/inventory/types'
import { ProductUnit } from '@/entities/inventory/types'
import { Pencil } from 'lucide-react'

const UNIT_LABELS: Record<ProductUnit, string> = {
  [ProductUnit.PIECE]: 'шт.',
  [ProductUnit.KG]: 'кг',
  [ProductUnit.LITER]: 'л',
  [ProductUnit.METER]: 'м',
  [ProductUnit.BOX]: 'кор.',
  [ProductUnit.PALLET]: 'пал.',
}

interface ProductTableProps {
  products?: Product[]
  loading?: boolean
  onEdit?: (product: Product) => void
  onSelect?: (product: Product) => void
}

const PAGE_SIZE = 25

export function ProductTable({ products = [], loading, onEdit, onSelect }: ProductTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const list = Array.isArray(products) ? products : []

  const filtered = list.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      false
    )
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    {
      key: 'name' as const,
      header: 'Товар / SKU',
      render: (row: Product) => (
        <div>
          <p className="font-medium text-neutral-900">{row.name}</p>
          <p className="text-xs font-mono-sku text-neutral-400">{row.sku}</p>
          {row.barcode && (
            <p className="text-xs font-mono-sku text-neutral-300">{row.barcode}</p>
          )}
        </div>
      ),
    },
    {
      key: 'unit' as const,
      header: 'Ед.',
      render: (row: Product) => UNIT_LABELS[row.unit],
    },
    {
      key: 'minStockLevel' as const,
      header: 'Мин. остаток',
      render: (row: Product) => (
        <div className="flex items-center gap-1">
          {row.minStockLevel != null && (
            <>
              {/* In real app, compare with actual stock */}
              <span>{row.minStockLevel}</span>
            </>
          )}
          {row.minStockLevel == null && <span className="text-neutral-300">—</span>}
        </div>
      ),
    },
    {
      key: 'isActive' as const,
      header: 'Статус',
      render: (row: Product) => (
        <Badge variant={row.isActive ? 'active' : 'cancelled'}>
          {row.isActive ? 'Активен' : 'Неактивен'}
        </Badge>
      ),
    },
    {
      key: 'id' as const,
      header: '',
      className: 'w-16',
      render: (row: Product) => (
        <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); onEdit?.(row) }}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  return (
    <Card>
      <div className="px-4 py-3 border-b border-neutral-100">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1) }}
          placeholder="Поиск по SKU, названию, штрихкоду..."
          className="max-w-sm"
        />
      </div>
      {loading ? (
        <TableSkeleton rows={PAGE_SIZE} cols={5} />
      ) : !filtered.length ? (
        <EmptyState title="Товары не найдены" description="Попробуйте изменить параметры поиска" />
      ) : (
        <>
          <Table
            columns={columns}
            data={paginated}
            keyExtractor={(p) => p.id}
            onRowClick={onSelect}
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
