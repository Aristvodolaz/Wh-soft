'use client'

import { useOnline } from '@/shared/hooks/use-online'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-warning-500 text-white flex items-center justify-center gap-2 py-2 text-sm font-medium">
      <WifiOff className="h-4 w-4" />
      Нет подключения к интернету. Данные могут быть устаревшими.
    </div>
  )
}
