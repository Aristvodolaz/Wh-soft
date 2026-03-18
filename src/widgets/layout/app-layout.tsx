'use client'

import { useCallback, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OfflineBanner } from '@/shared/ui/offline-banner'
import { CommandPalette } from '@/shared/ui/command-palette'
import { useThemeStore } from '@/shared/store/theme-store'
import { useWmsWebSocket } from '@/shared/hooks/use-websocket'
import type { WmsEvent } from '@/shared/hooks/use-websocket'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useThemeStore((s) => s.theme)
  const qc = useQueryClient()

  const onEvent = useCallback((e: WmsEvent) => {
    switch (e.type) {
      case 'task.assigned':
        qc.invalidateQueries({ queryKey: ['tasks'] })
        toast('Задача назначена', { icon: '📋' })
        break
      case 'task.started':
        qc.invalidateQueries({ queryKey: ['tasks'] })
        break
      case 'task.completed':
        qc.invalidateQueries({ queryKey: ['tasks'] })
        toast.success('Задача выполнена')
        break
      case 'task.failed':
        qc.invalidateQueries({ queryKey: ['tasks'] })
        toast.error('Задача завершилась с ошибкой')
        break
      case 'task.cancelled':
        qc.invalidateQueries({ queryKey: ['tasks'] })
        break
      case 'order.status_changed':
        qc.invalidateQueries({ queryKey: ['orders'] })
        toast('Статус заказа изменён', { icon: '📦' })
        break
      case 'order.item_added':
        qc.invalidateQueries({ queryKey: ['orders'] })
        break
      case 'inventory.moved':
        qc.invalidateQueries({ queryKey: ['inventory'] })
        break
      case 'inventory.received':
        qc.invalidateQueries({ queryKey: ['inventory'] })
        toast('Товар принят на склад', { icon: '✅' })
        break
      case 'warehouse.utilization_updated':
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        break
      default:
        break
    }
  }, [qc])

  useWmsWebSocket({ onEvent })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-50 dark:bg-neutral-900">
      <OfflineBanner />
      <CommandPalette />
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  )
}
