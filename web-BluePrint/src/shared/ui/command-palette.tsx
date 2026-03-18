'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWarehouses } from '@/features/warehouses/api/use-warehouses'
import { useProducts } from '@/features/inventory/api/use-inventory'
import { useOrders } from '@/features/orders/api/use-orders'
import { Search, Warehouse, Package, ShoppingCart, Truck, LayoutDashboard, X } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface CommandItem {
  id: string
  label: string
  sublabel?: string
  icon: React.ReactNode
  href: string
  group: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { data: warehouses } = useWarehouses()
  const { data: products } = useProducts()
  const { data: orders } = useOrders()

  const staticItems: CommandItem[] = [
    { id: 'dashboard', label: 'Дашборд', icon: <LayoutDashboard className="h-4 w-4" />, href: '/dashboard', group: 'Навигация' },
    { id: 'warehouses', label: 'Склады', icon: <Warehouse className="h-4 w-4" />, href: '/warehouses', group: 'Навигация' },
    { id: 'receiving', label: 'Приёмка', icon: <Truck className="h-4 w-4" />, href: '/receiving', group: 'Навигация' },
    { id: 'orders', label: 'Заказы', icon: <ShoppingCart className="h-4 w-4" />, href: '/orders', group: 'Навигация' },
    { id: 'products', label: 'Товары', icon: <Package className="h-4 w-4" />, href: '/inventory/products', group: 'Навигация' },
  ]

  const dynamicItems: CommandItem[] = [
    ...(warehouses?.map((w) => ({
      id: `w-${w.id}`,
      label: w.name,
      sublabel: w.code,
      icon: <Warehouse className="h-4 w-4" />,
      href: `/warehouses/${w.id}`,
      group: 'Склады',
    })) ?? []),
    ...(products?.map((p) => ({
      id: `p-${p.id}`,
      label: p.name,
      sublabel: p.sku,
      icon: <Package className="h-4 w-4" />,
      href: `/inventory/products`,
      group: 'Товары',
    })) ?? []),
    ...(orders?.slice(0, 20).map((o) => ({
      id: `o-${o.id}`,
      label: o.orderNumber ?? `Заказ ${o.id.slice(0, 8)}`,
      sublabel: o.customerName ?? o.status,
      icon: <ShoppingCart className="h-4 w-4" />,
      href: `/orders/${o.id}`,
      group: 'Заказы',
    })) ?? []),
  ]

  const allItems = query.trim() === ''
    ? staticItems
    : [...staticItems, ...dynamicItems].filter((item) => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          (item.sublabel?.toLowerCase().includes(q) ?? false)
        )
      })

  // Group items
  const grouped = allItems.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const flatItems = Object.values(grouped).flat()

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setSelectedIndex(0)
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleOpen()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const handleCustom = () => handleOpen()
    window.addEventListener('keydown', handleKey)
    window.addEventListener('open-command-palette', handleCustom)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('open-command-palette', handleCustom)
    }
  }, [handleOpen])

  const navigate = (href: string) => {
    router.push(href)
    setOpen(false)
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, flatItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const item = flatItems[selectedIndex]
      if (item) navigate(item.href)
    }
  }

  if (!open) return null

  let flatIndex = 0

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/50 dark:bg-neutral-900/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100 dark:border-neutral-700">
          <Search className="h-4 w-4 text-neutral-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Поиск по складу, товарам, заказам..."
            className="flex-1 bg-transparent text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-400 px-1.5 py-0.5 rounded font-mono-sku">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {Object.entries(grouped).length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-neutral-400">Ничего не найдено</p>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <div key={group}>
                <p className="px-4 py-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">
                  {group}
                </p>
                {items.map((item) => {
                  const iIdx = flatIndex++
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setSelectedIndex(iIdx)}
                      className={cn(
                        'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                        selectedIndex === iIdx
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
                      )}
                    >
                      <span className={cn(
                        'shrink-0',
                        selectedIndex === iIdx ? 'text-primary-500' : 'text-neutral-400 dark:text-neutral-500'
                      )}>
                        {item.icon}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{item.label}</span>
                        {item.sublabel && (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono-sku truncate block">
                            {item.sublabel}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
          <span><kbd className="font-mono-sku">↑↓</kbd> навигация</span>
          <span><kbd className="font-mono-sku">↵</kbd> выбрать</span>
          <span><kbd className="font-mono-sku">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  )
}
