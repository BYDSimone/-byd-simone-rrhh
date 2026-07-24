'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'
import type { Holiday } from './page'
import {
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Download,
  Globe,
  Flag,
} from 'lucide-react'

// ─── Argentina preset holidays 2026 ──────────────────────────────────────────

const ARGENTINA_HOLIDAYS_2026: Array<{ date: string; name: string; is_national: boolean }> = [
  { date: '2026-01-01', name: 'Año Nuevo', is_national: true },
  { date: '2026-04-02', name: 'Día del Veterano y de los Caídos en la Guerra de Malvinas', is_national: true },
  { date: '2026-04-03', name: 'Viernes Santo (asueto)', is_national: false },
  { date: '2026-04-04', name: 'Sábado Santo', is_national: false },
  { date: '2026-05-01', name: 'Día del Trabajador', is_national: true },
  { date: '2026-05-25', name: 'Día de la Revolución de Mayo', is_national: true },
  { date: '2026-06-20', name: 'Paso a la Inmortalidad del General Manuel Belgrano', is_national: true },
  { date: '2026-07-09', name: 'Día de la Independencia', is_national: true },
  { date: '2026-08-17', name: 'Paso a la Inmortalidad del Gral. José de San Martín', is_national: true },
  { date: '2026-10-12', name: 'Día del Respeto a la Diversidad Cultural', is_national: true },
  { date: '2026-11-20', name: 'Día de la Soberanía Nacional', is_national: true },
  { date: '2026-12-08', name: 'Inmaculada Concepción de María', is_national: true },
  { date: '2026-12-25', name: 'Navidad', is_national: true },
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const holidaySchema = z.object({
  date: z.string().min(1, 'Requerido'),
  name: z.string().min(2, 'Mínimo 2 caracteres').max(120, 'Máximo 120 caracteres'),
  is_national: z.boolean(),
})

type HolidayForm = z.infer<typeof holidaySchema>

// ─── Add Holiday Form ─────────────────────────────────────────────────────────

function AddHolidayForm({
  year,
  onAdded,
}: {
  year: number
  onAdded: (holiday: Holiday) => void
}) {
  const supabase = createClient()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HolidayForm>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { date: '', name: '', is_national: true },
  })

  const onSubmit = async (values: HolidayForm) => {
    const { data, error } = await supabase
      .from('holidays')
      .insert({ date: values.date, name: values.name, is_national: values.is_national, year })
      .select()
      .single()

    if (error) {
      toast.error('Error al agregar el feriado')
      return
    }
    toast.success('Feriado agregado')
    onAdded(data as Holiday)
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Agregar feriado</h3>
      <div className="flex flex-wrap items-end gap-3">
        {/* Date */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Fecha *</label>
          <input
            type="date"
            {...register('date')}
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
        </div>

        {/* Name */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs font-medium text-gray-500">Nombre *</label>
          <input
            type="text"
            {...register('name')}
            placeholder="Ej: Día del Trabajador"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        {/* Is national */}
        <div className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            id="is_national"
            {...register('is_national')}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <label htmlFor="is_national" className="text-sm text-gray-700">Nacional</label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition"
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Agregar
        </button>
      </div>
    </form>
  )
}

// ─── Holiday Row ──────────────────────────────────────────────────────────────

function HolidayRow({
  holiday,
  onDelete,
}: {
  holiday: Holiday
  onDelete: (id: string) => void
}) {
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${holiday.name}"?`)) return
    setDeleting(true)
    const { error } = await supabase.from('holidays').delete().eq('id', holiday.id)
    if (error) {
      toast.error('Error al eliminar el feriado')
    } else {
      toast.success('Feriado eliminado')
      onDelete(holiday.id)
    }
    setDeleting(false)
  }

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-700">{formatDate(holiday.date)}</td>
      <td className="px-4 py-3 text-sm font-medium text-gray-800">{holiday.name}</td>
      <td className="px-4 py-3 text-center">
        {holiday.is_national ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            <Globe className="h-3 w-3" />
            Nacional
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            <Flag className="h-3 w-3" />
            Local
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          title="Eliminar"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </td>
    </tr>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function HolidaysClientPage({
  initialHolidays,
  currentYear,
}: {
  initialHolidays: Holiday[]
  currentYear: number
}) {
  const supabase = createClient()
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [importing, setImporting] = useState(false)

  const visibleHolidays = holidays
    .filter((h) => h.year === selectedYear)
    .sort((a, b) => a.date.localeCompare(b.date))

  const handleAdded = (holiday: Holiday) => {
    setHolidays((prev) => [...prev, holiday])
  }

  const handleDeleted = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id))
  }

  const importArgentina2026 = async () => {
    if (selectedYear !== 2026) {
      toast.error('La importación de feriados preset es solo para 2026')
      return
    }

    const existing = holidays.filter((h) => h.year === 2026).map((h) => h.date)
    const toImport = ARGENTINA_HOLIDAYS_2026.filter((h) => !existing.includes(h.date))

    if (toImport.length === 0) {
      toast.info('Todos los feriados preset ya están cargados')
      return
    }

    setImporting(true)
    const rows = toImport.map((h) => ({ ...h, year: 2026 }))
    const { data, error } = await supabase
      .from('holidays')
      .insert(rows)
      .select()

    if (error) {
      toast.error('Error al importar feriados')
    } else {
      setHolidays((prev) => [...prev, ...(data as Holiday[])])
      toast.success(`${data.length} feriado(s) importado(s)`)
    }
    setImporting(false)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feriados</h1>
            <p className="text-sm text-gray-500">Gestión de feriados por año</p>
          </div>
        </div>

        {selectedYear === 2026 && (
          <button
            onClick={importArgentina2026}
            disabled={importing}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Importar feriados Argentina 2026
          </button>
        )}
      </div>

      {/* Year tabs */}
      <div className="flex gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {[currentYear, currentYear + 1].map((year) => (
          <button
            key={year}
            onClick={() => setSelectedYear(year)}
            className={cn(
              'rounded-lg px-5 py-2 text-sm font-medium transition-colors',
              selectedYear === year
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {year}
          </button>
        ))}
      </div>

      {/* Add form */}
      <AddHolidayForm year={selectedYear} onAdded={handleAdded} />

      {/* Table */}
      {visibleHolidays.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <CalendarDays className="h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-500">No hay feriados para {selectedYear}</p>
          <p className="text-xs text-gray-400">Agregalos manualmente o importá los de Argentina</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
            {visibleHolidays.length} feriado{visibleHolidays.length !== 1 ? 's' : ''} en {selectedYear}
          </div>
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Nombre
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleHolidays.map((h) => (
                <HolidayRow key={h.id} holiday={h} onDelete={handleDeleted} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
