'use client'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { useRouter } from 'next/navigation'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
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

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'WM'

  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-4 shrink-0">
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-neutral-500">
          Tenant: <span className="font-medium text-neutral-700">{user?.tenantSlug ?? '—'}</span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button className="relative h-9 w-9 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-colors">
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 h-9 px-3 rounded-md text-sm text-neutral-700 hover:bg-neutral-100 transition-colors"
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
                'absolute right-0 top-full mt-1 w-48 bg-white rounded-lg border border-neutral-200 shadow-lg z-20',
                'py-1'
              )}>
                <div className="px-3 py-2 border-b border-neutral-100">
                  <p className="text-xs font-medium text-neutral-900">{user?.email}</p>
                  <p className="text-xs text-neutral-400">{user?.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
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
