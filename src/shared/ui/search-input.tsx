'use client'

import { cn } from '@/shared/lib/cn'
import { Search, X } from 'lucide-react'
import { useEffect, useState, type ChangeEvent } from 'react'

interface SearchInputProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  debounce?: number
  className?: string
}

export function SearchInput({
  value: externalValue = '',
  onChange,
  placeholder = 'Поиск...',
  debounce = 300,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(externalValue)

  useEffect(() => {
    setInternalValue(externalValue)
  }, [externalValue])

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(internalValue)
    }, debounce)
    return () => clearTimeout(timer)
  }, [internalValue, debounce, onChange])

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={internalValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full h-9 rounded-md border border-neutral-300 bg-white pl-9 pr-8 text-base text-neutral-900 placeholder:text-neutral-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500',
          'transition-colors duration-150'
        )}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
