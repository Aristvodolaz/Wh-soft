'use client'

import { useThemeStore } from '@/shared/store/theme-store'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@/shared/lib/cn'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      className={cn(
        'h-9 w-9 flex items-center justify-center rounded-md transition-colors',
        'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
        'dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200',
        className
      )}
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  )
}
