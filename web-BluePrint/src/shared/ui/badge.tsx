import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        active: 'bg-success-50 text-success-700',
        pending: 'bg-warning-50 text-warning-700',
        'in-progress': 'bg-primary-50 text-primary-700',
        completed: 'bg-neutral-100 text-neutral-600',
        cancelled: 'bg-danger-50 text-danger-700',
        draft: 'bg-neutral-100 text-neutral-500',
        failed: 'bg-danger-50 text-danger-700',
        shipped: 'bg-info-500 bg-opacity-10 text-info-600',
        default: 'bg-neutral-100 text-neutral-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string
  children: React.ReactNode
  dot?: boolean
}

export function Badge({ variant, className, children, dot = true }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      {dot && <span className="text-[8px]">●</span>}
      {children}
    </span>
  )
}
