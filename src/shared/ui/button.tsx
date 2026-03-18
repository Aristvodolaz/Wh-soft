import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 active:scale-[0.98] focus:ring-primary-500 shadow-xs',
        secondary:
          'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 hover:border-neutral-400 focus:ring-primary-500',
        ghost:
          'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus:ring-primary-500',
        danger:
          'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 active:scale-[0.98] focus:ring-danger-500 shadow-xs',
        success:
          'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 active:scale-[0.98] focus:ring-success-500 shadow-xs',
        warning:
          'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 active:scale-[0.98] focus:ring-warning-500 shadow-xs',
      },
      size: {
        xs: 'h-7 px-[10px] text-xs rounded-md',
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-9 px-4 text-base rounded-md',
        lg: 'h-11 px-5 text-md rounded-md',
        xl: 'h-13 px-6 text-md rounded-lg',
        icon: 'h-9 w-9 rounded-md',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
