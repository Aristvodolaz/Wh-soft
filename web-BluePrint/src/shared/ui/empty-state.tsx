import { cn } from '@/shared/lib/cn'
import { PackageSearch } from 'lucide-react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 text-neutral-300">
        {icon || <PackageSearch className="h-12 w-12" />}
      </div>
      <h3 className="text-base font-semibold text-neutral-600 mb-1">{title}</h3>
      {description && <p className="text-sm text-neutral-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
