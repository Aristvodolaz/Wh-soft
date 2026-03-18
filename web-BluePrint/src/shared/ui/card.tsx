import { cn } from '@/shared/lib/cn'

type CardAccent = 'none' | 'primary' | 'success' | 'warning' | 'danger'

interface CardProps {
  className?: string
  children: React.ReactNode
  accent?: CardAccent
}

const accentClasses: Record<CardAccent, string> = {
  none: '',
  primary: 'border-t-2 border-t-primary-500',
  success: 'border-t-2 border-t-success-500',
  warning: 'border-t-2 border-t-warning-500',
  danger: 'border-t-2 border-t-danger-500',
}

export function Card({ className, children, accent = 'none' }: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-neutral-200 shadow-sm',
        accentClasses[accent],
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-6 py-4 border-b border-neutral-100', className)}>
      {children}
    </div>
  )
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('px-6 py-4 border-t border-neutral-100', className)}>
      {children}
    </div>
  )
}
