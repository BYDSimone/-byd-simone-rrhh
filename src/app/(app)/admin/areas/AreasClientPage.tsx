'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Area } from './page'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Users,
  LayoutGrid,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const areaSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
  description: z.string().max(200, 'Máximo 200 caracteres').optional().or(z.literal('')),
  color: z.string().min(1, 'Seleccioná un color'),
})

type AreaForm = z.infer<typeof areaSchema>

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (c: string) => void
}) {
  return (
    <div className="flex gap-2 flex-wrap">
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

// ─── Modal ────────────────────────────────────────────────────────────────────

function AreaModal({
  area,
  onClose,
  onSave,
}: {
  area: Area | null
  onClose: () => void
  onSave: (area: Area) => void
}) {
  const supabase = createClient()
  const isEditing = Boolean(area)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AreaForm>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      name: area?.name ?? '',
      description: area?.description ?? '',
      color: area?.color ?? PRESET_COLORS[0],
    },
  })

  const colorValue = watch('color')

  const onSubmit = async (values: AreaForm) => {
    if (isEditing && area) {
      const { data, error } = await supabase
        .from('areas')
        .update({ name: values.name, description: values.description || null, color: values.color })
        .eq('id', area.id)
        .select()
        .single()

      if (error) { toast.error('Error al actualizar el área'); return }
      toast.success('Área actualizada')
      onSave({ ...area, ...data, member_count: area.member_count })
    } else {
      const { data, error } = await supabase
        .from('areas')
        .insert({ name: values.name, description: values.description || null, color: values.color })
        .select()
        .single()

      if (error) { toast.error('Error al crear el área'); return }
      toast.success('Área creada')
      onSave({ ...data, member_count: 0 })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? 'Editar área' : 'Nueva área'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Name */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Nombre *</label>
            <input
              {...register('name')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ej: Ventas"
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Descripción</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descripción opcional del área"
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Color *</label>
            <ColorPicker value={colorValue} onChange={(c) => setValue('color', c)} />
            {errors.color && <p className="text-xs text-red-500">{errors.color.message}</p>}
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
              {isEditing ? 'Guardar cambios' : 'Crear área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({
  area,
  onClose,
  onDeleted,
}: {
  area: Area
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (area.member_count > 0) {
      toast.error(`No se puede eliminar: el área tiene ${area.member_count} colaborador(es) asignado(s)`)
      onClose()
      return
    }
    setLoading(true)
    const { error } = await supabase.from('areas').delete().eq('id', area.id)
    if (error) {
      toast.error('Error al eliminar el área')
    } else {
      toast.success('Área eliminada')
      onDeleted(area.id)
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-gray-900">¿Eliminar área?</h2>
        <p className="mt-2 text-sm text-gray-500">
          Vas a eliminar <strong>{area.name}</strong>.{' '}
          {area.member_count > 0
            ? `Tiene ${area.member_count} colaborador(es) asignado(s) — no se puede eliminar.`
            : 'Esta acción no se puede deshacer.'}
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading || area.member_count > 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function AreasClientPage({ initialAreas }: { initialAreas: Area[] }) {
  const [areas, setAreas] = useState<Area[]>(initialAreas)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<Area | null>(null)
  const [deletingArea, setDeletingArea] = useState<Area | null>(null)

  const openCreate = () => { setEditingArea(null); setModalOpen(true) }
  const openEdit = (area: Area) => { setEditingArea(area); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingArea(null) }

  const handleSave = (saved: Area) => {
    setAreas((prev) => {
      const exists = prev.find((a) => a.id === saved.id)
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved]
    })
  }

  const handleDeleted = (id: string) => {
    setAreas((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Áreas</h1>
            <p className="text-sm text-gray-500">{areas.length} área{areas.length !== 1 ? 's' : ''} configurada{areas.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          Nueva área
        </button>
      </div>

      {/* Table */}
      {areas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <LayoutGrid className="h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-500">No hay áreas configuradas</p>
          <button
            onClick={openCreate}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Crear la primera área
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Área
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden sm:table-cell">
                  Descripción
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Miembros
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: area.color ?? '#6b7280' }}
                      />
                      <span className="font-medium text-gray-800">{area.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {area.description ?? <span className="italic text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <Users className="h-3.5 w-3.5 text-gray-400" />
                      {area.member_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(area)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingArea(area)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modalOpen && (
        <AreaModal area={editingArea} onClose={closeModal} onSave={handleSave} />
      )}
      {deletingArea && (
        <DeleteConfirm
          area={deletingArea}
          onClose={() => setDeletingArea(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
