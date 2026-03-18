import type { Metadata } from 'next'
import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = {
  title: 'Вход',
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500 rounded-xl mb-4">
            <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">WMS Platform</h1>
          <p className="text-sm text-neutral-500 mt-1">Система управления складом</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Вход в систему</h2>
          <LoginForm />
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          WMS Platform © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
