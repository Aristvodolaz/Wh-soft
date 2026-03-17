'use client'

import { useEffect } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { OfflineBanner } from '@/shared/ui/offline-banner'
import { CommandPalette } from '@/shared/ui/command-palette'
import { useThemeStore } from '@/shared/store/theme-store'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useThemeStore((s) => s.theme)

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
