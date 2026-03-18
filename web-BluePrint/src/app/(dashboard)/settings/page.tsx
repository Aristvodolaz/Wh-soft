import type { Metadata } from 'next'
import { Card } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Settings } from 'lucide-react'

export const metadata: Metadata = { title: 'Настройки' }

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Настройки</h1>
      </div>
      <Card>
        <EmptyState
          icon={<Settings className="h-12 w-12" />}
          title="Настройки системы"
          description="Конфигурация аккаунта, уведомлений и разрешений."
        />
      </Card>
    </div>
  )
}
