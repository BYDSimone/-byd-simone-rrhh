'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Loader2, AlertCircle, Calendar, Info } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/dates'

const schema = z.object({
  benefit_type_id: z.string().min(1, 'Seleccioná un tipo de solicitud'),
  start_date:      z.string().min(1, 'Seleccioná la fecha de inicio'),
  end_date:        z.string().min(1, 'Seleccioná la fecha de fin'),
  is_half_day:     z.boolean().default(false),
  half_day_period: z.enum(['morning', 'afternoon', '']).optional(),
  reason:          z.string().optional(),
}).refine(d => d.end_date >= d.start_date, {
  message: 'La fecha de fin debe ser igual o posterior a la de inicio',
  path: ['end_date'],
})

type FormData = z.infer<typeof schema>

export default function NewRequestPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [benefitTypes, setBenefitTypes] = useState<any[]>([])
  const [selectedBt,   setSelectedBt]   = useState<any>(null)
  const [balance,      setBalance]       = useState<any>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date:  new Date().toISOString().split('T')[0],
      end_date:    new Date().toISOString().split('T')[0],
      is_half_day: false,
    },
  })

  const watchType    = watch('benefit_type_id')
  const watchStart   = watch('start_date')
  const watchEnd     = watch('end_date')
  const watchHalfDay = watch('is_half_day')

  useEffect(() => {
    supabase
      .from('benefit_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setBenefitTypes(data ?? []))
  }, [])

  useEffect(() => {
    const bt = benefitTypes.find(b => b.id === watchType)
    setSelectedBt(bt ?? null)
  }, [watchType, benefitTypes])

  useEffect(() => {
    if (!watchType) return
    setLoadingBalance(true)
    supabase
      .from('benefit_balances')
      .select('*')
      .eq('benefit_type_id', watchType)
      .eq('year', new Date().getFullYear())
      .single()
      .then(({ data }) => { setBalance(data); setLoadingBalance(false) })
  }, [watchType])

  // Calcular días (simplificado en cliente — el servidor recalcula)
  const dayCount = useMemo_days(watchStart, watchEnd, watchHalfDay)

  async function onSubmit(data: FormData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Sesión expirada'); return }

    const { error } = await supabase.from('requests').insert({
      employee_id:      user.id,
      benefit_type_id:  data.benefit_type_id,
      start_date:       data.start_date,
      end_date:         data.end_date,
      is_half_day:      data.is_half_day,
      half_day_period:  data.is_half_day ? data.half_day_period : null,
      reason:           data.reason || null,
      status:           selectedBt?.needs_approval ? 'pending' : 'approved',
    })

    if (error) { toast.error(error.message); return }

    toast.success('Solicitud enviada correctamente.')
    router.push('/requests')
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/requests" className="btn-ghost btn-sm">
          <ArrowLeft size={16} /> Volver
        </Link>
      </div>

      <h1 className="text-2xl font-bold tracking-tight mb-1">Nueva solicitud</h1>
      <p className="text-text-muted text-sm mb-6">Completá los datos para enviar tu solicitud.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>

        {/* Tipo de beneficio */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold mb-4">¿Qué tipo de solicitud es?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {benefitTypes.map(bt => (
              <label
                key={bt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  watchType === bt.id
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-border hover:border-border-strong bg-surface'
                }`}
              >
                <input
                  type="radio"
                  value={bt.id}
                  {...register('benefit_type_id')}
                  className="sr-only"
                />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: bt.color }} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${watchType === bt.id ? 'text-brand-700' : 'text-text-primary'}`}>
                    {bt.name}
                  </p>
                  {bt.requires_certificate && (
                    <p className="text-xs text-amber-600 mt-0.5">Requiere certificado</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          {errors.benefit_type_id && <p className="form-error mt-2">{errors.benefit_type_id.message}</p>}
        </div>

        {/* Saldo disponible */}
        {selectedBt && (
          <div className={`rounded-lg border p-4 flex items-start gap-3 ${
            balance?.available === 0 ? 'bg-red-50 border-red-200' :
            (balance?.available ?? 0) <= 1 ? 'bg-amber-50 border-amber-200' :
            'bg-brand-50 border-brand-200'
          }`}>
            <Info size={16} className="mt-0.5 flex-shrink-0 text-brand-600" />
            <div>
              {loadingBalance ? (
                <p className="text-sm text-text-muted">Cargando saldo...</p>
              ) : balance ? (
                <>
                  <p className="text-sm font-semibold text-text-primary">
                    Saldo disponible: <span className={balance.available === 0 ? 'text-status-rejected' : 'text-brand-700'}>{balance.available} día{balance.available !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Asignados: {balance.total_granted} · Usados: {balance.used} · Pendientes: {balance.pending}
                    {balance.expires_at && ` · Vence: ${formatDate(balance.expires_at)}`}
                  </p>
                  {balance.available === 0 && (
                    <p className="text-xs text-status-rejected font-medium mt-1">
                      No tenés saldo disponible para este tipo de licencia.
                    </p>
                  )}
                </>
              ) : selectedBt.max_days_per_year ? (
                <p className="text-sm text-text-muted">Sin saldo asignado para este año.</p>
              ) : (
                <p className="text-sm text-text-muted">Este beneficio no tiene límite de días.</p>
              )}
            </div>
          </div>
        )}

        {/* Fechas */}
        {selectedBt && (
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold">Fechas</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Desde *</label>
                <input type="date" className="form-input" {...register('start_date')} />
                {errors.start_date && <p className="form-error">{errors.start_date.message}</p>}
              </div>
              <div>
                <label className="form-label">Hasta *</label>
                <input type="date" className="form-input" {...register('end_date')} />
                {errors.end_date && <p className="form-error">{errors.end_date.message}</p>}
              </div>
            </div>

            {/* Medio día */}
            {selectedBt.allow_half_day && (
              <div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('is_half_day')}
                    onChange={e => {
                      setValue('is_half_day', e.target.checked)
                      if (e.target.checked) setValue('end_date', watch('start_date'))
                    }}
                    className="w-4 h-4 rounded border-border text-brand-600"
                  />
                  <span className="text-sm text-text-secondary">Solicitar medio día</span>
                </label>
                {watchHalfDay && (
                  <div className="mt-3 ml-6">
                    <label className="form-label">Período</label>
                    <div className="flex gap-3">
                      {(['morning', 'afternoon'] as const).map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value={p} {...register('half_day_period')} className="w-4 h-4" />
                          <span className="text-sm">{p === 'morning' ? 'Mañana' : 'Tarde'}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview días */}
            {dayCount > 0 && (
              <div className="bg-surface-subtle rounded-lg px-4 py-3 flex items-center gap-2">
                <Calendar size={15} className="text-brand-600" />
                <span className="text-sm text-text-secondary">
                  <strong className="text-text-primary">{dayCount}</strong> día{dayCount !== 1 ? 's' : ''} hábil{dayCount !== 1 ? 'es' : ''}
                  {watchHalfDay && ' (medio día)'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Motivo */}
        {selectedBt && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold mb-3">
              Motivo{selectedBt.requires_certificate ? ' y documentación' : ' (opcional)'}
            </h2>
            <textarea
              rows={3}
              className="form-input resize-none"
              placeholder={selectedBt.requires_certificate
                ? 'Describí brevemente el motivo. Podrás adjuntar el certificado luego.'
                : 'Podés agregar una descripción opcional...'}
              {...register('reason')}
            />
            {selectedBt.requires_certificate && (
              <div className="mt-3 flex items-start gap-2 text-amber-600 bg-amber-50 rounded-md px-3 py-2.5">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  Este tipo de licencia requiere un certificado médico.
                  Podrás adjuntarlo desde el detalle de la solicitud una vez creada.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 justify-end">
          <Link href="/requests" className="btn-secondary">Cancelar</Link>
          <button type="submit" className="btn-primary" disabled={isSubmitting || !selectedBt}>
            {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Enviando...</> : 'Enviar solicitud'}
          </button>
        </div>
      </form>
    </div>
  )
}

// Helper para calcular días sin llamar al servidor
function useMemo_days(start: string, end: string, halfDay: boolean): number {
  if (!start || !end || end < start) return 0
  if (halfDay) return 0.5
  let count = 0
  const d = new Date(start + 'T12:00:00')
  const e = new Date(end   + 'T12:00:00')
  while (d <= e) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}
