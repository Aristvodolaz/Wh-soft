import type { Metadata } from 'next'
import { Card } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Plug } from 'lucide-react'

export const metadata: Metadata = { title: 'Интеграции' }

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Интеграции</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Подключение внешних систем</p>
      </div>
      <Card>
        <EmptyState
          icon={<Plug className="h-12 w-12" />}
          title="Интеграции"
          description="Wildberries, Ozon, 1С — будут доступны в Stage 3."
        />
      </Card>
    </div>
  )
}
