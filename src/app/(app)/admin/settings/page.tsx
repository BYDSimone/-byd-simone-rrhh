'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Settings, Building2, Globe, Clock, Save, Loader2 } from 'lucide-react'

interface OrgSettings {
  id: string
  org_name: string
  timezone: string
  country: string
  weekly_hours: number
  overtime_daily_limit: number
}

const TIMEZONES = [
  { value: 'America/Argentina/Buenos_Aires', label: 'Argentina (UTC-3)' },
  { value: 'America/Santiago', label: 'Chile (UTC-4/-3)' },
  { value: 'America/Bogota', label: 'Colombia (UTC-5)' },
  { value: 'America/Lima', label: 'Perú (UTC-5)' },
  { value: 'America/Mexico_City', label: 'México (UTC-6/-5)' },
  { value: 'Europe/Madrid', label: 'España (UTC+1/+2)' },
]

export default function AdminSettingsPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()

  const [settings, setSettings] = useState<OrgSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    org_name: '',
    timezone: 'America/Argentina/Buenos_Aires',
    country: 'Argentina',
    weekly_hours: 48,
    overtime_daily_limit: 3,
  })

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }

    async function load() {
      const { data } = await supabase
        .from('org_settings')
        .select('*')
        .single()

      if (data) {
        setSettings(data)
        setForm({
          org_name: data.org_name ?? 'BYD Simone',
          timezone: data.timezone ?? 'America/Argentina/Buenos_Aires',
          country: data.country ?? 'Argentina',
          weekly_hours: data.weekly_hours ?? 48,
          overtime_daily_limit: data.overtime_daily_limit ?? 3,
        })
      } else {
        // No settings row yet — use defaults
        setForm({
          org_name: 'BYD Simone',
          timezone: 'America/Argentina/Buenos_Aires',
          country: 'Argentina',
          weekly_hours: 48,
          overtime_daily_limit: 3,
        })
      }
      setLoading(false)
    }

    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('org_settings')
          .update(form)
          .eq('id', settings.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('org_settings')
          .insert(form)
        if (error) throw error
      }
      toast.success('Configuración guardada')
    } catch (err: unknown) {
      toast.error('Error al guardar la configuración')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Ajustes generales de la organización</p>
        </div>
      </div>

      {/* Organización */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Building2 className="h-4 w-4 text-gray-500" />
          Organización
        </h2>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            Nombre de la empresa
          </label>
          <input
            type="text"
            value={form.org_name}
            onChange={(e) => setForm((f) => ({ ...f, org_name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">País</label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Zona horaria */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Globe className="h-4 w-4 text-gray-500" />
          Zona horaria
        </h2>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Zona horaria</label>
          <select
            value={form.timezone}
            onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Horas de trabajo */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800">
          <Clock className="h-4 w-4 text-gray-500" />
          Horas laborales
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Horas semanales
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.weekly_hours}
              onChange={(e) =>
                setForm((f) => ({ ...f, weekly_hours: Number(e.target.value) }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Límite diario horas extra
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={form.overtime_daily_limit}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  overtime_daily_limit: Number(e.target.value),
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">
              Según LCT art. 200: máximo 3 hs/día
            </p>
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Guardar configuración
        </button>
      </div>
    </div>
  )
}
