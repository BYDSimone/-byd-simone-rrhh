'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { BenefitType } from './page'
import {
  Gift,
  Pencil,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  FileCheck,
  Clock,
  ThumbsUp,
  Hash,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const benefitTypeSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  description: z.string().max(300, 'Máximo 300 caracteres').optional().or(z.literal('')),
  max_days_per_year: z
    .string()
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : Number(v)))
    .pipe(z.number().int().positive().nullable()),
  is_active: z.boolean(),
  requires_certificate: z.boolean(),
  allow_half_day: z.boolean(),
  needs_approval: z.boolean(),
  color: z.string().min(1, 'Seleccioná un color'),
  sort_order: z
    .string()
    .transform((v) => Number(v || '0'))
    .pipe(z.number().int().min(0)),
})

type BenefitTypeForm = z.infer<typeof benefitTypeSchema>

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition',
            value === c ? 'border-gray-800 scale-110' : 'border-transparent hover:scale-105',
          )}
          style={{ backgroundColor: c }}
          title={c}
        />
      ))}
    </div>
  )
}

// ─── Toggle Field ─────────────────────────────────────────────────────────────

function ToggleField({
  label,
  description,
  value,
  onChange,
  icon: Icon,
}: {
  label: string
  description?: string
  value: boolean
  onChange: (v: boolean) => void
  icon?: React.ElementType
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
        value ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
      )}
    >
      {Icon && <Icon className={cn('h-4 w-4 shrink-0', value ? 'text-blue-600' : 'text-gray-400')} />}
      <div className="flex-1">
        <p className={cn('text-sm font-medium', value ? 'text-blue-700' : 'text-gray-600')}>{label}</p>
        {description && <p className="text-xs text-gray-400">{description}</p>}
      </div>
      {value ? (
        <ToggleRight className="h-5 w-5 text-blue-500" />
      ) : (
        <ToggleLeft className="h-5 w-5 text-gray-300" />
      )}
    </button>
  )
}

// ─── Edit/Create Modal ────────────────────────────────────────────────────────

function EditModal({
  benefitType,
  onClose,
  onSave,
}: {
  benefitType: BenefitType | null   // null = crear nuevo
  onClose: () => void
  onSave: (saved: BenefitType) => void
}) {
  const supabase = createClient()
  const isCreating = benefitType === null

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BenefitTypeForm>({
    resolver: zodResolver(benefitTypeSchema),
    defaultValues: isCreating ? {
      name: '',
      description: '',
      max_days_per_year: '' as unknown as number,
      is_active: true,
      requires_certificate: false,
      allow_half_day: false,
      needs_approval: true,
      color: PRESET_COLORS[0],
      sort_order: '99' as unknown as number,
    } : {
      name: benefitType.name,
      description: benefitType.description ?? '',
      max_days_per_year: benefitType.max_days_per_year !== null
        ? (benefitType.max_days_per_year as unknown as string)
        : '',
      is_active: benefitType.is_active,
      requires_certificate: benefitType.requires_certificate,
      allow_half_day: benefitType.allow_half_day,
      needs_approval: benefitType.needs_approval,
      color: benefitType.color ?? PRESET_COLORS[0],
      sort_order: String(benefitType.sort_order) as unknown as number,
    },
  })

  const colorValue = watch('color')
  const isActive = watch('is_active')
  const requiresCert = watch('requires_certificate')
  const allowHalf = watch('allow_half_day')
  const needsApproval = watch('needs_approval')

  const onSubmit = async (values: BenefitTypeForm) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      max_days_per_year: values.max_days_per_year,
      is_active: values.is_active,
      requires_certificate: values.requires_certificate,
      allow_half_day: values.allow_half_day,
      needs_approval: values.needs_approval,
      color: values.color,
      sort_order: values.sort_order,
    }

    if (isCreating) {
      const { data, error } = await supabase
        .from('benefit_types')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error('Error al crear el tipo de beneficio'); return }
      toast.success('Tipo de beneficio creado')
      onSave(data as BenefitType)
    } else {
      const { data, error } = await supabase
        .from('benefit_types')
        .update(payload)
        .eq('id', benefitType.id)
        .select()
        .single()
      if (error) { toast.error('Error al guardar el tipo de beneficio'); return }
      toast.success('Tipo de beneficio actualizado')
      onSave({ ...benefitType, ...data } as BenefitType)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isCreating ? 'Nuevo tipo de beneficio' : 'Editar tipo de beneficio'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          const first = Object.values(errs)[0]
          toast.error((first as any)?.message ?? 'Revisá los campos del formulario')
        })} className="space-y-4 p-6">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Max days + Sort order */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Días máx/año
                <span className="ml-1 text-xs font-normal text-gray-400">(vacío = sin límite)</span>
              </label>
              <input
                {...register('max_days_per_year')}
                type="number"
                min={1}
                placeholder="Sin límite"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Orden de visualización</label>
              <input
                {...register('sort_order')}
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Color *</label>
            <ColorPicker value={colorValue} onChange={(c) => setValue('color', c)} />
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Configuración</label>
            <ToggleField
              label="Activo"
              description="El tipo aparece disponible para solicitudes"
              value={isActive}
              onChange={(v) => setValue('is_active', v)}
            />
            <ToggleField
              label="Requiere certificado"
              description="El colaborador debe adjuntar documentación"
              value={requiresCert}
              onChange={(v) => setValue('requires_certificate', v)}
              icon={FileCheck}
            />
            <ToggleField
              label="Permite medio día"
              description="Se puede solicitar 0.5 días"
              value={allowHalf}
              onChange={(v) => setValue('allow_half_day', v)}
              icon={Clock}
            />
            <ToggleField
              label="Requiere aprobación"
              description="El líder/manager debe aprobar la solicitud"
              value={needsApproval}
              onChange={(v) => setValue('needs_approval', v)}
              icon={ThumbsUp}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Benefit Type Card ────────────────────────────────────────────────────────

function BenefitTypeRow({
  bt,
  onEdit,
  onToggleActive,
}: {
  bt: BenefitType
  onEdit: (bt: BenefitType) => void
  onToggleActive: (bt: BenefitType) => void
}) {
  return (
    <tr className={cn('transition-colors hover:bg-gray-50', !bt.is_active && 'opacity-60')}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: bt.color ?? '#6b7280' }}
          />
          <div>
            <p className="text-sm font-medium text-gray-800">{bt.name}</p>
            {bt.description && (
              <p className="text-xs text-gray-400 truncate max-w-[200px]">{bt.description}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm text-gray-600">
        {bt.max_days_per_year !== null ? (
          <span className="inline-flex items-center gap-1">
            <Hash className="h-3 w-3 text-gray-400" />
            {bt.max_days_per_year}d
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic">Sin límite</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <FeatureIcon enabled={bt.requires_certificate} icon={FileCheck} label="Cert." />
      </td>
      <td className="px-4 py-3 text-center">
        <FeatureIcon enabled={bt.allow_half_day} icon={Clock} label="½ día" />
      </td>
      <td className="px-4 py-3 text-center">
        <FeatureIcon enabled={bt.needs_approval} icon={ThumbsUp} label="Aprobación" />
      </td>
      <td className="px-4 py-3 text-center">
        {bt.is_active ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" />
            Activo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
            <XCircle className="h-3 w-3" />
            Inactivo
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => onToggleActive(bt)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title={bt.is_active ? 'Desactivar' : 'Activar'}
          >
            {bt.is_active ? (
              <ToggleRight className="h-4 w-4 text-blue-500" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onEdit(bt)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function FeatureIcon({ enabled, icon: Icon, label }: { enabled: boolean; icon: React.ElementType; label: string }) {
  return enabled ? (
    <span className="inline-flex items-center justify-center" title={label}>
      <Icon className="h-4 w-4 text-blue-500" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center" title={`Sin ${label}`}>
      <span className="h-4 w-4 text-gray-200">—</span>
    </span>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function BenefitTypesClientPage({ initialTypes }: { initialTypes: BenefitType[] }) {
  const supabase = createClient()
  const [types, setTypes] = useState<BenefitType[]>(initialTypes)
  const [editingType, setEditingType] = useState<BenefitType | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleSave = (saved: BenefitType) => {
    setTypes((prev) => {
      const exists = prev.find((t) => t.id === saved.id)
      if (exists) return prev.map((t) => (t.id === saved.id ? saved : t))
      return [...prev, saved].sort((a, b) => a.sort_order - b.sort_order)
    })
  }

  const openCreate = () => { setEditingType(null); setModalOpen(true) }
  const openEdit = (bt: BenefitType) => { setEditingType(bt); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingType(null) }

  const handleToggleActive = async (bt: BenefitType) => {
    const newValue = !bt.is_active
    const { error } = await supabase
      .from('benefit_types')
      .update({ is_active: newValue })
      .eq('id', bt.id)

    if (error) {
      toast.error('Error al actualizar el estado')
    } else {
      toast.success(newValue ? 'Tipo activado' : 'Tipo desactivado')
      setTypes((prev) =>
        prev.map((t) => (t.id === bt.id ? { ...t, is_active: newValue } : t)),
      )
    }
  }

  const activeCount = types.filter((t) => t.is_active).length

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Gift className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tipos de beneficio</h1>
            <p className="text-sm text-gray-500">
              {types.length} tipo{types.length !== 1 ? 's' : ''} configurado{types.length !== 1 ? 's' : ''} — {activeCount} activo{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo tipo
        </button>
      </div>

      {/* Note */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Para eliminar un tipo de beneficio, desactivalo. Esto preserva el historial de solicitudes existentes.
      </div>

      {/* Table */}
      {types.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Gift className="h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-500">No hay tipos de beneficio configurados</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Nombre</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Días/año</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Cert.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">½ día</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Aprobación</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {types.map((bt) => (
                <BenefitTypeRow
                  key={bt.id}
                  bt={bt}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <EditModal
          benefitType={editingType}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
