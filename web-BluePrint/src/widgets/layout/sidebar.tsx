'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/cn'
import {
  LayoutDashboard,
  Warehouse,
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  BarChart3,
  Plug,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Truck,
  ClipboardCheck,
  UserCheck,
} from 'lucide-react'
import { useState } from 'react'
import { usePermissions, useRole, type Permissions } from '@/shared/hooks/use-permissions'

type NavKey = keyof Permissions['nav']

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  permKey?: NavKey
}

const bottomItems: NavItem[] = [
  { href: '/settings', label: 'Настройки', icon: <Settings className="h-5 w-5" /> },
  { href: '/help', label: 'Помощь', icon: <HelpCircle className="h-5 w-5" /> },
]

const ROLE_BADGE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'bg-danger-100 text-danger-700',
  WAREHOUSE_ADMIN: 'bg-primary-100 text-primary-700',
  MANAGER: 'bg-warning-100 text-warning-700',
  WORKER: 'bg-neutral-100 text-neutral-600',
  ANALYST: 'bg-success-100 text-success-700',
}
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Супер-Адм.',
  WAREHOUSE_ADMIN: 'Адм. склада',
  MANAGER: 'Менеджер',
  WORKER: 'Рабочий',
  ANALYST: 'Аналитик',
}

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const { nav } = usePermissions()
  const role = useRole()

  const ALL_NAV: NavItem[] = [
    { href: '/dashboard',          label: 'Дашборд',        icon: <LayoutDashboard className="h-5 w-5" />, permKey: 'dashboard' as NavKey },
    { href: '/warehouses',         label: 'Склад',           icon: <Warehouse className="h-5 w-5" />,       permKey: 'warehouses' as NavKey },
    { href: '/receiving',          label: 'Приёмка',         icon: <Truck className="h-5 w-5" />,           permKey: 'receiving' as NavKey },
    { href: '/inventory/products', label: 'Товары',          icon: <Package className="h-5 w-5" />,         permKey: 'products' as NavKey },
    { href: '/orders',             label: 'Заказы',          icon: <ShoppingCart className="h-5 w-5" />,    permKey: 'orders' as NavKey },
    { href: '/tasks',              label: 'Задачи',          icon: <ClipboardList className="h-5 w-5" />,   permKey: 'tasks' as NavKey },
    { href: '/tasks/my',           label: 'Мои задачи',      icon: <UserCheck className="h-5 w-5" />,       permKey: 'myTasks' as NavKey },
    { href: '/employees',          label: 'Сотрудники',      icon: <Users className="h-5 w-5" />,           permKey: 'employees' as NavKey },
    { href: '/analytics',          label: 'Аналитика',       icon: <BarChart3 className="h-5 w-5" />,       permKey: 'analytics' as NavKey },
    { href: '/inventory/audit',    label: 'Инвентаризация',  icon: <ClipboardCheck className="h-5 w-5" />, permKey: 'audit' as NavKey },
    { href: '/integrations',       label: 'Интеграции',      icon: <Plug className="h-5 w-5" />,            permKey: 'integrations' as NavKey },
  ]
  const navItems = ALL_NAV.filter((item) => !item.permKey || nav[item.permKey])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-white border-r border-neutral-200 transition-all duration-200',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-neutral-100 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="shrink-0 w-7 h-7 bg-primary-500 rounded-lg flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-neutral-900 text-sm truncate block">WMS Platform</span>
              {role && (
                <span className={cn(
                  'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-none mt-0.5',
                  ROLE_BADGE_COLOR[role] ?? 'bg-neutral-100 text-neutral-600'
                )}>
                  {ROLE_LABEL[role] ?? role}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 scrollbar-thin">
        <ul className="space-y-0.5 px-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-9 rounded-md px-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <span className={cn('shrink-0', isActive(item.href) ? 'text-primary-600' : '')}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto shrink-0 bg-primary-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-neutral-100 py-3 px-2">
        <ul className="space-y-0.5">
          {bottomItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 h-9 rounded-md px-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 flex items-center gap-3 h-9 w-full rounded-md px-2.5 text-sm text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        >
          <span className="shrink-0">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </span>
          {!collapsed && <span>Свернуть</span>}
        </button>
      </div>
    </aside>
  )
}
