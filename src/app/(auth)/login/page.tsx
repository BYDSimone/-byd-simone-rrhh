'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router  = useRouter()
  const supabase = createClient()
  const [showPass, setShowPass] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email:    data.email,
      password: data.password,
    })
    if (error) {
      setServerError('Email o contraseña incorrectos.')
      return
    }
  window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4 shadow-card-md">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.4L20 8.5l-8 4.1-8-4.1L12 4.4zM3.5 9.8l7.5 3.9v7.5L3.5 17V9.8zm9.5 11.4v-7.5l7.5-3.9V17l-7.5 4.2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">BYD Simone</h1>
          <p className="text-sm text-text-muted mt-1">Recursos Humanos</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">
            Iniciar sesión
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

            {/* Email */}
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@bydsimone.com.ar"
                className="form-input"
                {...register('email')}
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="form-input pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {/* Error del servidor */}
            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full justify-center py-2.5"
            >
              {isSubmitting
                ? <><Loader2 size={16} className="animate-spin" /> Ingresando...</>
                : 'Ingresar'}
            </button>
          </form>

          {/* Forgot password */}
          <div className="mt-4 text-center">
            <a
              href="/reset-password"
              className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          Plataforma interna · Solo para empleados BYD Simone
        </p>
      </div>
    </div>
  )
}
