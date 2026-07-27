'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppContext } from '@/lib/context/AppContext'
import { formatDate, getAntiguedad } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'
import { SUCURSAL_LABELS } from '@/lib/types'
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  Loader2,
  Save,
} from 'lucide-react'

// ─── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  phone: z.string().max(30, 'Máximo 30 caracteres').optional().or(z.literal('')),
  notes: z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
})

type ProfileForm = z.infer<typeof profileSchema>

// ─── Types ───────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  position: string | null
  area: { name: string } | null
  sucursal: string | null
  notes: string | null
  dob: string | null
  hire_date: string | null
  avatar_url: string | null
}

interface BenefitBalance {
  id: string
  benefit_type: { name: string; color: string | null }
  year: number
  total_days: number
  used_days: number
  pending_days: number
}

// ─── Avatar Component ────────────────────────────────────────────────────────

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

  const sizeClasses = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-10 w-10 text-sm'

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-blue-600 font-semibold text-white select-none',
        sizeClasses,
      )}
    >
      {initials}
    </div>
  )
}

// ─── Read-only Field ─────────────────────────────────────────────────────────

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ElementType
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-gray-400" />}
        <span>{value || <span className="italic text-gray-400">Sin información</span>}</span>
      </div>
    </div>
  )
}

// ─── Balance Card ────────────────────────────────────────────────────────────

function BalanceCard({ balance }: { balance: BenefitBalance }) {
  const remaining = balance.total_days - balance.used_days - balance.pending_days
  const usedPct = balance.total_days > 0 ? (balance.used_days / balance.total_days) * 100 : 0
  const pendingPct = balance.total_days > 0 ? (balance.pending_days / balance.total_days) * 100 : 0

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: balance.benefit_type.color ?? '#3b82f6' }}
        />
        <span className="text-sm font-medium text-gray-800">{balance.benefit_type.name}</span>
      </div>

      {balance.total_days > 0 ? (
        <>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="flex h-full">
              <div
                className="bg-blue-500"
                style={{ width: `${usedPct}%` }}
                title={`Usados: ${balance.used_days}d`}
              />
              <div
                className="bg-yellow-400"
                style={{ width: `${pendingPct}%` }}
                title={`Pendientes: ${balance.pending_days}d`}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold text-blue-600">{balance.used_days}</p>
              <p className="text-gray-500">Usados</p>
            </div>
            <div>
              <p className="font-semibold text-yellow-500">{balance.pending_days}</p>
              <p className="text-gray-500">Pendientes</p>
            </div>
            <div>
              <p className={cn('font-semibold', remaining > 0 ? 'text-green-600' : 'text-red-500')}>
                {remaining}
              </p>
              <p className="text-gray-500">Disponibles</p>
            </div>
          </div>
          <p className="mt-2 text-right text-xs text-gray-400">Total: {balance.total_days} días</p>
        </>
      ) : (
        <p className="text-sm text-gray-400 italic">Sin límite configurado</p>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = createClient()
  const { userId } = useAppContext()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balances, setBalances] = useState<BenefitBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { phone: '', notes: '' },
  })

  const notesValue = watch('notes') ?? ''

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)

      const { data: profileData } = await supabase
        .from('profiles')
        .select(
          `id, full_name, email, phone, position, notes, dob, hire_date, avatar_url, sucursal,
           area:areas(name)`,
        )
        .eq('id', userId)
        .single()

      if (profileData) {
        setProfile(profileData as unknown as Profile)
        reset({ phone: profileData.phone ?? '', notes: profileData.notes ?? '' })
      }

      const currentYear = new Date().getFullYear()
      const { data: balanceData } = await supabase
        .from('benefit_balances')
        .select(
          `id, year, total_days, used_days, pending_days,
           benefit_type:benefit_types(name, color)`,
        )
        .eq('employee_id', userId)
        .eq('year', currentYear)
        .order('benefit_type(name)')

      if (balanceData) setBalances(balanceData as unknown as BenefitBalance[])
      setLoading(false)
    }
    load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handler ──────────────────────────────────────────────────────────
  const onSubmit = async (values: ProfileForm) => {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ phone: values.phone || null, notes: values.notes || null })
      .eq('id', profile.id)

    if (error) {
      toast.error('Error al guardar el perfil')
    } else {
      toast.success('Perfil actualizado correctamente')
      setProfile((prev) => prev ? { ...prev, phone: values.phone || null, notes: values.notes || null } : prev)
      reset(values)
    }
    setSaving(false)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        No se pudo cargar el perfil.
      </div>
    )
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-6">
        <Avatar name={profile.full_name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
          <p className="text-sm text-gray-500">{profile.position ?? 'Sin cargo'}</p>
          {profile.hire_date && (
            <p className="mt-1 text-xs text-gray-400">
              Antigüedad: {getAntiguedad(profile.hire_date)}
            </p>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">Información personal</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Nombre completo" value={profile.full_name} icon={User} />
            <ReadOnlyField label="Email" value={profile.email} icon={User} />
            <ReadOnlyField label="Cargo" value={profile.position} icon={Briefcase} />
            <ReadOnlyField label="Área" value={profile.area?.name} icon={Building2} />
            <ReadOnlyField
              label="Sucursal"
              value={
                profile.sucursal
                  ? (SUCURSAL_LABELS as Record<string, string>)[profile.sucursal] ?? profile.sucursal
                  : null
              }
              icon={MapPin}
            />
            <ReadOnlyField
              label="Fecha de nacimiento"
              value={profile.dob ? formatDate(profile.dob) : null}
              icon={CalendarDays}
            />

            {/* Editable: Phone */}
            <div className="space-y-1">
              <label
                htmlFor="phone"
                className="text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Teléfono
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
                <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  id="phone"
                  {...register('phone')}
                  type="tel"
                  placeholder="+54 11 1234-5678"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div className="mt-4 space-y-1">
            <label
              htmlFor="notes"
              className="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Bio / Sobre mí
            </label>
            <div className="rounded-lg border border-gray-300 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <div className="flex items-start gap-2 px-3 pt-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={4}
                  placeholder="Contá algo sobre vos..."
                  className="w-full resize-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
              <p className="px-3 pb-2 text-right text-xs text-gray-400">
                {notesValue.length}/500
              </p>
            </div>
            {errors.notes && <p className="text-xs text-red-500">{errors.notes.message}</p>}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || saving}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition',
              isDirty && !saving
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-300',
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Guardar cambios
          </button>
        </div>
      </form>

      {/* Benefit Balances */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-800">
          Mis saldos — {currentYear}
        </h2>
        {balances.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
            No tenés saldos configurados para este año.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {balances.map((b) => (
              <BalanceCard key={b.id} balance={b} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
