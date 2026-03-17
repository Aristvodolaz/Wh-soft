'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Building2, Lock, Mail } from 'lucide-react'
import { authApi } from '../api/auth-api'
import { useAuthStore } from '../store/auth-store'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
  tenantSlug: z.string().min(1, 'Укажите организацию'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const setTokens = useAuthStore((s) => s.setTokens)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const { mutate: login, isPending } = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      console.log('Login success, full response data:', data)
      console.log('Token fields:', { 
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        access_token: (data as any).access_token,
        refresh_token: (data as any).refresh_token
      })
      setTokens(data.accessToken, data.refreshToken)
      console.log('Tokens set, navigating to dashboard...')
      toast.success('Добро пожаловать!')
      router.replace('/dashboard')
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error('Неверный email или пароль')
      } else if (status === 404) {
        toast.error('Организация не найдена')
      } else {
        toast.error('Ошибка входа. Попробуйте ещё раз.')
      }
    },
  })

  const onSubmit = (data: LoginFormData) => {
    login(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Организация"
        placeholder="company-slug"
        leftIcon={<Building2 className="h-4 w-4" />}
        error={errors.tenantSlug?.message}
        {...register('tenantSlug')}
      />
      <Input
        label="Email"
        type="email"
        placeholder="user@company.com"
        leftIcon={<Mail className="h-4 w-4" />}
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        label="Пароль"
        type="password"
        placeholder="••••••••"
        leftIcon={<Lock className="h-4 w-4" />}
        error={errors.password?.message}
        {...register('password')}
      />
      <Button
        type="submit"
        className="w-full"
        size="lg"
        loading={isPending}
      >
        Войти
      </Button>
    </form>
  )
}
