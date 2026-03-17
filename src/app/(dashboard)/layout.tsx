'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { AppLayout } from '@/widgets/layout/app-layout'
import { FullPageSpinner } from '@/shared/ui/spinner'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
    } else {
      setChecking(false)
    }
  }, [isAuthenticated, router])

  if (checking) {
    return <FullPageSpinner />
  }

  return <AppLayout>{children}</AppLayout>
}
