'use client'

import { cn } from '@/shared/lib/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export function Pagination({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  if (total === 0) return null

  return (
    <div className={cn('flex items-center justify-between px-4 py-3', className)}>
      <p className="text-sm text-neutral-500">
        {start}–{end} из {total}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded border border-neutral-200 px-2 text-sm text-neutral-600 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} / стр.
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-8 flex items-center justify-center rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let p = i + 1
          if (totalPages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= totalPages - 2) p = totalPages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded border text-sm',
                p === page
                  ? 'bg-primary-500 text-white border-primary-500'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="h-8 w-8 flex items-center justify-center rounded border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
