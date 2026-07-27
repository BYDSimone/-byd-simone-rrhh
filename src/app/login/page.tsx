'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Ingresá tu email y contraseña.')
      return
    }

    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (authError) {
      setError('Email o contraseña incorrectos.')
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-surface-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 mb-4 shadow-card-md">
            <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.4L20 8.5l-8 4.1-8-4.1L12 4.4zM3.5 9.8l7.5 3.9v7.5L3.5 17V9.8zm9.5 11.4v-7.5l7.5-3.9V17l-7.5 4.2z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">BYD Simone</h1>
          <p className="text-sm text-text-muted mt-1">Recursos Humanos</p>
        </div>
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">Iniciar sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" placeholder="nombre@bydsimone.com.ar" className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Contraseña</label>
              <div className="relative">
                <input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" className="form-input pr-10" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary" tabIndex={-1}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', color: '#b91c1c', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Ingresando...</> : 'Ingresar'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-text-muted mt-6">Plataforma interna · Solo para empleados BYD Simone</p>
      </div>
    </div>
  )
}
