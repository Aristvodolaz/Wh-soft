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
  const [hydrated, setHydrated] = useState(false)

  // Wait for persist to load tokens from localStorage before auth check (avoids false redirect to /login)
  useEffect(() => {
    console.log('🔄 Dashboard layout mounting, checking hydration...')
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      console.log('✅ Zustand persist hydration finished')
      setHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      console.log('✅ Already hydrated')
      setHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!hydrated) {
      console.log('⏳ Waiting for hydration...')
      return
    }
    console.log('🔐 Checking authentication...')
    if (!isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to /login')
      router.replace('/login')
    } else {
      console.log('✅ Authenticated, rendering dashboard')
    }
  }, [hydrated, isAuthenticated, router])

  if (!hydrated || !isAuthenticated()) {
    return <FullPageSpinner />
  }

  return <AppLayout>{children}</AppLayout>
}
