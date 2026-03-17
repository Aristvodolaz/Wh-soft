'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { AppLayout } from '@/widgets/layout/app-layout'
import { FullPageSpinner } from '@/shared/ui/spinner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    console.log('Dashboard layout effect:', { hasHydrated, isChecking })
    
    // Don't check auth until store has hydrated from localStorage
    if (!hasHydrated) {
      console.log('Waiting for hydration...')
      return
    }

    const authenticated = isAuthenticated()
    console.log('Auth check result:', authenticated)
    
    if (!authenticated) {
      console.log('Not authenticated, redirecting to login')
      router.replace('/login')
    } else {
      console.log('Authenticated, showing dashboard')
      setIsChecking(false)
    }
  }, [hasHydrated, isAuthenticated, router])

  if (isChecking) {
    return <FullPageSpinner />
  }

  return <AppLayout>{children}</AppLayout>
}
