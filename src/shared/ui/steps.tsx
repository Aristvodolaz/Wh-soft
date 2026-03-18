'use client'

import { cn } from '@/shared/lib/cn'
import { Check } from 'lucide-react'

interface Step {
  label: string
  description?: string
}

interface StepsProps {
  steps: Step[]
  current: number
  className?: string
}

export function Steps({ steps, current, className }: StepsProps) {
  return (
    <div className={cn('flex items-center gap-0', className)}>
      {steps.map((step, index) => {
        const isDone = index < current
        const isActive = index === current
        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors',
                  isDone
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : isActive
                    ? 'border-primary-500 text-primary-600 bg-white'
                    : 'border-neutral-300 text-neutral-400 bg-white'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <div className="mt-1.5 text-center">
                <div
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    isActive ? 'text-primary-700' : isDone ? 'text-neutral-700' : 'text-neutral-400'
                  )}
                >
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-neutral-400 whitespace-nowrap">{step.description}</div>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mt-[-20px] transition-colors',
                  isDone ? 'bg-primary-400' : 'bg-neutral-200'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
