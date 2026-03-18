'use client'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { ThemeToggle } from '@/shared/ui/theme-toggle'
import toast from 'react-hot-toast'

export function Topbar() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    toast.success('Вы вышли из системы')
    router.push('/login')
  }

  const handleSearchClick = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'))
  }

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'WM'

  return (
    <header className="h-14 bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between px-4 shrink-0">
      {/* Left — search trigger */}
      <button
        onClick={handleSearchClick}
        className="flex items-center gap-2 h-9 px-3 rounded-md text-sm text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors w-56"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">Поиск...</span>
        <kbd className="text-xs bg-neutral-200 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 px-1.5 py-0.5 rounded font-mono-sku">⌘K</kbd>
      </button>

      {/* Right */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 h-9 px-3 rounded-md text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <div className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
            <span className="font-medium">{user?.email?.split('@')[0] ?? 'User'}</span>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className={cn(
                'absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg z-20',
                'py-1'
              )}>
                <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-700">
                  <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">{user?.email}</p>
                  <p className="text-xs text-neutral-400">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
