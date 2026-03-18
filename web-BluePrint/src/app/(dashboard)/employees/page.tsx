import type { Metadata } from 'next'
import { Card } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Users } from 'lucide-react'

export const metadata: Metadata = { title: 'Сотрудники' }

export default function EmployeesPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Сотрудники</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Управление персоналом склада</p>
      </div>
      <Card>
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="Модуль сотрудников"
          description="Будет доступен в Stage 2. Управление профилями, KPI и сменами."
        />
      </Card>
    </div>
  )
}
