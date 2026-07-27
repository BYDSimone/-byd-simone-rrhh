'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useAppContext } from '@/lib/context/AppContext'
import { cn } from '@/lib/utils'
import { formatDate, formatDateTime } from '@/lib/utils/dates'

// ─── Types ────────────────────────────────────────────────────────────────────

type PolicyCategory =
  | 'conduct'
  | 'dress_code'
  | 'absenteeism'
  | 'safety'
  | 'it'
  | 'hr'
  | 'commercial'
  | 'other'

interface PolicyDocument {
  id: string
  title: string
  description: string | null
  category: PolicyCategory
  file_path: string | null
  file_name: string | null
  file_type: string | null
  file_size: number | null
  version: string
  is_active: boolean
  is_mandatory: boolean
  published_at: string | null
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

interface PolicyAcknowledgment {
  id: string
  document_id: string
  employee_id: string
  acknowledged_at: string
  profiles: { full_name: string } | null
}

interface Props {
  documents: (PolicyDocument & { ack_count: number })[]
  totalEmployees: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<PolicyCategory, string> = {
  conduct: 'Código de Conducta',
  dress_code: 'Código de Vestimenta',
  absenteeism: 'Ausentismo',
  safety: 'Seguridad e Higiene',
  it: 'Tecnología',
  hr: 'Recursos Humanos',
  commercial: 'Comercial',
  other: 'Otros',
}

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [
  PolicyCategory,
  string,
][]

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const documentSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  category: z.enum([
    'conduct',
    'dress_code',
    'absenteeism',
    'safety',
    'it',
    'hr',
    'commercial',
    'other',
  ]),
  version: z.string().min(1, 'La versión es requerida'),
  is_mandatory: z.boolean(),
})

type DocumentFormValues = z.infer<typeof documentSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function compliancePct(ackCount: number, total: number): number {
  if (total === 0) return 0
  return Math.round((ackCount / total) * 100)
}

// ─── Confirmation Dialog ───────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-md">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mb-6 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Modal ────────────────────────────────────────────────────────────

interface DocumentModalProps {
  open: boolean
  document: (PolicyDocument & { ack_count: number }) | null
  onClose: () => void
  onSaved: (doc: PolicyDocument & { ack_count: number }) => void
}

function DocumentModal({ open, document, onClose, onSaved }: DocumentModalProps) {
  const supabase = createClient()
  const { userId } = useAppContext()
  const [isPending, startTransition] = useTransition()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEdit = !!document

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'conduct',
      version: '1.0',
      is_mandatory: false,
    },
  })

  useEffect(() => {
    if (open) {
      if (document) {
        reset({
          title: document.title,
          description: document.description ?? '',
          category: document.category,
          version: document.version,
          is_mandatory: document.is_mandatory,
        })
      } else {
        reset({
          title: '',
          description: '',
          category: 'conduct',
          version: '1.0',
          is_mandatory: false,
        })
      }
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open, document, reset])

  const uploadFile = async (
    file: File,
    category: PolicyCategory,
    docId: string,
  ): Promise<{
    file_path: string
    file_name: string
    file_type: string
    file_size: number
  } | null> => {
    const path = `policies/${category}/${docId}/${file.name}`
    const { error } = await supabase.storage
      .from('policy-documents')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) {
      toast.error(`Error al subir archivo: ${error.message}`)
      return null
    }
    return {
      file_path: path,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
    }
  }

  const onSubmit = (values: DocumentFormValues) => {
    startTransition(async () => {
      if (isEdit && document) {
        // Update existing
        const updatePayload: Partial<PolicyDocument> = {
          title: values.title,
          description: values.description || null,
          category: values.category,
          version: values.version,
          is_mandatory: values.is_mandatory,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        }

        if (selectedFile) {
          const fileData = await uploadFile(selectedFile, values.category, document.id)
          if (!fileData) return
          Object.assign(updatePayload, fileData)
        }

        const { data: updated, error } = await supabase
          .from('policy_documents')
          .update(updatePayload)
          .eq('id', document.id)
          .select()
          .single()

        if (error) {
          toast.error(`Error al actualizar: ${error.message}`)
          return
        }
        toast.success('Documento actualizado')
        onSaved({ ...updated, ack_count: document.ack_count })
      } else {
        // Insert new (draft, unpublished)
        const { data: newDoc, error: insertError } = await supabase
          .from('policy_documents')
          .insert({
            title: values.title,
            description: values.description || null,
            category: values.category,
            version: values.version,
            is_mandatory: values.is_mandatory,
            is_active: true,
            published_at: null,
            created_by: userId,
            updated_by: userId,
          })
          .select()
          .single()

        if (insertError) {
          toast.error(`Error al crear documento: ${insertError.message}`)
          return
        }

        let finalDoc = newDoc

        if (selectedFile) {
          const fileData = await uploadFile(selectedFile, values.category, newDoc.id)
          if (fileData) {
            const { data: withFile, error: updateError } = await supabase
              .from('policy_documents')
              .update({ ...fileData, updated_by: userId })
              .eq('id', newDoc.id)
              .select()
              .single()
            if (!updateError && withFile) {
              finalDoc = withFile
            }
          }
        }

        toast.success('Documento creado como borrador')
        onSaved({ ...finalDoc, ack_count: 0 })
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Editar documento' : 'Nuevo documento'}
          </h2>
          <button
            className="btn-ghost text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="form-label">Título *</label>
            <input
              {...register('title')}
              className="form-input"
              placeholder="Nombre del documento"
            />
            {errors.title && (
              <p className="form-error">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="form-label">Descripción</label>
            <textarea
              {...register('description')}
              className="form-input min-h-[80px] resize-y"
              placeholder="Descripción opcional"
            />
          </div>

          {/* Category */}
          <div>
            <label className="form-label">Categoría *</label>
            <select {...register('category')} className="form-input">
              {CATEGORY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="form-error">{errors.category.message}</p>
            )}
          </div>

          {/* Version */}
          <div>
            <label className="form-label">Versión *</label>
            <input
              {...register('version')}
              className="form-input"
              placeholder="1.0"
            />
            {errors.version && (
              <p className="form-error">{errors.version.message}</p>
            )}
          </div>

          {/* Mandatory */}
          <div className="flex items-center gap-3">
            <input
              {...register('is_mandatory')}
              type="checkbox"
              id="is_mandatory"
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <label htmlFor="is_mandatory" className="form-label mb-0 cursor-pointer">
              Documento obligatorio (requiere confirmación de empleados)
            </label>
          </div>

          {/* File Upload */}
          <div>
            <label className="form-label">
              {isEdit && document?.file_name ? 'Reemplazar archivo' : 'Archivo'}
            </label>
            {isEdit && document?.file_name && !selectedFile && (
              <p className="mb-1 text-xs text-gray-500">
                Actual: <span className="font-medium">{document.file_name}</span>
                {document.file_size && ` (${formatFileSize(document.file_size)})`}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg"
              className="form-input cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            {selectedFile && (
              <p className="mt-1 text-xs text-gray-500">
                Seleccionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear documento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Acknowledgments Side Panel ────────────────────────────────────────────────

interface AckPanelProps {
  document: PolicyDocument & { ack_count: number }
  totalEmployees: number
  onClose: () => void
}

function AcknowledgmentsPanel({ document, totalEmployees, onClose }: AckPanelProps) {
  const supabase = createClient()
  const [acknowledged, setAcknowledged] = useState<PolicyAcknowledgment[]>([])
  const [pendingEmployees, setPendingEmployees] = useState<
    { id: string; full_name: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      // Fetch acknowledgments with employee names
      const { data: acks } = await supabase
        .from('policy_acknowledgments')
        .select('*, profiles(full_name)')
        .eq('document_id', document.id)
        .order('acknowledged_at', { ascending: false })

      setAcknowledged((acks as PolicyAcknowledgment[]) ?? [])

      // Fetch all active employees
      const { data: allEmployees } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('full_name')

      const acknowledgedIds = new Set((acks ?? []).map((a) => a.employee_id))
      const pending = (allEmployees ?? []).filter((e) => !acknowledgedIds.has(e.id))
      setPendingEmployees(pending)

      setLoading(false)
    }
    load()
  }, [document.id])

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col bg-white shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-200 p-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Confirmaciones</h2>
          <p className="mt-0.5 text-sm text-gray-500">{document.title}</p>
        </div>
        <button className="btn-ghost text-gray-400 hover:text-gray-600" onClick={onClose}>
          ✕
        </button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          Cargando…
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Summary */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="mb-2 flex justify-between text-sm font-medium text-gray-700">
              <span>Progreso de confirmaciones</span>
              <span>
                {document.ack_count} / {totalEmployees} (
                {compliancePct(document.ack_count, totalEmployees)}%)
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{
                  width: `${compliancePct(document.ack_count, totalEmployees)}%`,
                }}
              />
            </div>
          </div>

          {/* Acknowledged */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs text-green-700">
                ✓
              </span>
              Confirmaron ({acknowledged.length})
            </h3>
            {acknowledged.length === 0 ? (
              <p className="text-sm text-gray-400">Ningún empleado aún</p>
            ) : (
              <ul className="space-y-2">
                {acknowledged.map((ack) => (
                  <li
                    key={ack.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {ack.profiles?.full_name ?? 'Empleado desconocido'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDateTime(ack.acknowledged_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Pending */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-100 text-xs text-yellow-700">
                !
              </span>
              Pendientes ({pendingEmployees.length})
            </h3>
            {pendingEmployees.length === 0 ? (
              <p className="text-sm text-green-600 font-medium">
                ¡Todos los empleados confirmaron!
              </p>
            ) : (
              <ul className="space-y-2">
                {pendingEmployees.map((emp) => (
                  <li
                    key={emp.id}
                    className="rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-700"
                  >
                    {emp.full_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Client Page ──────────────────────────────────────────────────────────

export default function AdminPoliciesClientPage({ documents: initialDocuments, totalEmployees }: Props) {
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()

  // State
  const [documents, setDocuments] = useState(initialDocuments)
  const [filterCategory, setFilterCategory] = useState<PolicyCategory | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [filterMandatory, setFilterMandatory] = useState<'all' | 'mandatory' | 'optional'>('all')

  // Modals
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<(PolicyDocument & { ack_count: number }) | null>(null)

  // Confirmations
  const [confirmDeactivate, setConfirmDeactivate] = useState<(PolicyDocument & { ack_count: number }) | null>(null)
  const [confirmUnpublish, setConfirmUnpublish] = useState<(PolicyDocument & { ack_count: number }) | null>(null)

  // Ack panel
  const [ackPanelDoc, setAckPanelDoc] = useState<(PolicyDocument & { ack_count: number }) | null>(null)

  // ── Filtered documents ──────────────────────────────────────────────────────
  const filtered = documents.filter((doc) => {
    if (filterCategory !== 'all' && doc.category !== filterCategory) return false
    if (filterStatus === 'active' && !doc.is_active) return false
    if (filterStatus === 'inactive' && doc.is_active) return false
    if (filterMandatory === 'mandatory' && !doc.is_mandatory) return false
    if (filterMandatory === 'optional' && doc.is_mandatory) return false
    return true
  })

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaved = (savedDoc: PolicyDocument & { ack_count: number }) => {
    setDocuments((prev) => {
      const idx = prev.findIndex((d) => d.id === savedDoc.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = savedDoc
        return next
      }
      return [savedDoc, ...prev]
    })
    setModalOpen(false)
    setEditingDoc(null)
  }

  const handlePublish = (doc: PolicyDocument & { ack_count: number }) => {
    startTransition(async () => {
      const { data, error } = await supabase
        .from('policy_documents')
        .update({ published_at: new Date().toISOString() })
        .eq('id', doc.id)
        .select()
        .single()
      if (error) {
        toast.error(`Error al publicar: ${error.message}`)
        return
      }
      toast.success('Documento publicado')
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...data, ack_count: d.ack_count } : d)),
      )
    })
  }

  const handleUnpublishConfirmed = () => {
    if (!confirmUnpublish) return
    const doc = confirmUnpublish
    setConfirmUnpublish(null)
    startTransition(async () => {
      const { data, error } = await supabase
        .from('policy_documents')
        .update({ published_at: null })
        .eq('id', doc.id)
        .select()
        .single()
      if (error) {
        toast.error(`Error al despublicar: ${error.message}`)
        return
      }
      toast.success('Documento despublicado. Los empleados ya no tienen acceso.')
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...data, ack_count: d.ack_count } : d)),
      )
    })
  }

  const handleDeactivateConfirmed = () => {
    if (!confirmDeactivate) return
    const doc = confirmDeactivate
    setConfirmDeactivate(null)
    startTransition(async () => {
      const newActive = !doc.is_active
      const { data, error } = await supabase
        .from('policy_documents')
        .update({ is_active: newActive })
        .eq('id', doc.id)
        .select()
        .single()
      if (error) {
        toast.error(`Error: ${error.message}`)
        return
      }
      toast.success(newActive ? 'Documento reactivado' : 'Documento desactivado')
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...data, ack_count: d.ack_count } : d)),
      )
    })
  }

  const openNew = () => {
    setEditingDoc(null)
    setModalOpen(true)
  }

  const openEdit = (doc: PolicyDocument & { ack_count: number }) => {
    setEditingDoc(doc)
    setModalOpen(true)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Políticas y Códigos Internos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestión de documentos, publicación y seguimiento de confirmaciones
            </p>
          </div>
          <button className="btn-primary shrink-0" onClick={openNew}>
            + Nuevo documento
          </button>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap items-center gap-4">
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <label className="form-label mb-0 whitespace-nowrap text-xs">
              Categoría
            </label>
            <select
              className="form-input py-1 text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as PolicyCategory | 'all')}
            >
              <option value="all">Todas</option>
              {CATEGORY_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <label className="form-label mb-0 whitespace-nowrap text-xs">Estado</label>
            <select
              className="form-input py-1 text-sm"
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')
              }
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          {/* Mandatory filter */}
          <div className="flex items-center gap-2">
            <label className="form-label mb-0 whitespace-nowrap text-xs">
              Obligatorio
            </label>
            <select
              className="form-input py-1 text-sm"
              value={filterMandatory}
              onChange={(e) =>
                setFilterMandatory(
                  e.target.value as 'all' | 'mandatory' | 'optional',
                )
              }
            >
              <option value="all">Todos</option>
              <option value="mandatory">Solo obligatorios</option>
              <option value="optional">Solo opcionales</option>
            </select>
          </div>

          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} documento{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="empty-state">
            <p className="text-gray-500">No se encontraron documentos con los filtros seleccionados.</p>
          </div>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Título</th>
                  <th>Versión</th>
                  <th>Obligatorio</th>
                  <th>Estado</th>
                  <th>Publicado</th>
                  <th>Confirmaciones</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => {
                  const pct = compliancePct(doc.ack_count, totalEmployees)
                  const isPublished = !!doc.published_at

                  return (
                    <tr
                      key={doc.id}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-gray-50',
                        !doc.is_active && 'opacity-60',
                      )}
                      onClick={() => doc.is_mandatory && setAckPanelDoc(doc)}
                    >
                      {/* Category */}
                      <td>
                        <span className="badge badge-neutral text-xs">
                          {CATEGORY_LABELS[doc.category]}
                        </span>
                      </td>

                      {/* Title */}
                      <td>
                        <div className="max-w-[220px]">
                          <p className="truncate font-medium text-gray-900">
                            {doc.title}
                          </p>
                          {doc.description && (
                            <p className="truncate text-xs text-gray-400">
                              {doc.description}
                            </p>
                          )}
                          {doc.file_name && (
                            <p className="mt-0.5 truncate text-xs text-blue-500">
                              📎 {doc.file_name}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Version */}
                      <td>
                        <span className="text-sm text-gray-600">v{doc.version}</span>
                      </td>

                      {/* Mandatory */}
                      <td>
                        {doc.is_mandatory ? (
                          <span className="badge badge-warning text-xs">Sí</span>
                        ) : (
                          <span className="text-xs text-gray-400">No</span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {!doc.is_active ? (
                          <span className="badge text-xs bg-gray-100 text-gray-500">
                            Inactivo
                          </span>
                        ) : isPublished ? (
                          <span className="badge text-xs bg-green-100 text-green-700">
                            Publicado
                          </span>
                        ) : (
                          <span className="badge text-xs bg-gray-100 text-gray-500">
                            Borrador
                          </span>
                        )}
                      </td>

                      {/* Published At */}
                      <td>
                        <span className="text-xs text-gray-500">
                          {doc.published_at ? formatDate(doc.published_at) : '—'}
                        </span>
                      </td>

                      {/* Acknowledgments */}
                      <td onClick={(e) => e.stopPropagation()}>
                        {doc.is_mandatory ? (
                          <div className="min-w-[140px]">
                            <div className="mb-1 flex justify-between text-xs text-gray-600">
                              <span>
                                {doc.ack_count} / {totalEmployees}
                              </span>
                              <span className="font-medium">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  pct === 100
                                    ? 'bg-green-500'
                                    : pct >= 50
                                      ? 'bg-yellow-400'
                                      : 'bg-red-400',
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            className="btn-ghost text-xs px-2 py-1"
                            onClick={() => openEdit(doc)}
                          >
                            Editar
                          </button>

                          {doc.is_active && !isPublished && (
                            <button
                              className="btn-ghost text-xs px-2 py-1 text-green-700 hover:bg-green-50"
                              onClick={() => handlePublish(doc)}
                              disabled={isPending}
                            >
                              Publicar
                            </button>
                          )}

                          {doc.is_active && isPublished && (
                            <button
                              className="btn-ghost text-xs px-2 py-1 text-yellow-700 hover:bg-yellow-50"
                              onClick={() => setConfirmUnpublish(doc)}
                              disabled={isPending}
                            >
                              Despublicar
                            </button>
                          )}

                          {doc.is_mandatory && (
                            <button
                              className="btn-ghost text-xs px-2 py-1 text-blue-700 hover:bg-blue-50"
                              onClick={() => setAckPanelDoc(doc)}
                            >
                              Ver confirmaciones
                            </button>
                          )}

                          <button
                            className={cn(
                              'btn-ghost text-xs px-2 py-1',
                              doc.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-700 hover:bg-green-50',
                            )}
                            onClick={() => setConfirmDeactivate(doc)}
                            disabled={isPending}
                          >
                            {doc.is_active ? 'Desactivar' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Modal */}
      <DocumentModal
        open={modalOpen}
        document={editingDoc}
        onClose={() => {
          setModalOpen(false)
          setEditingDoc(null)
        }}
        onSaved={handleSaved}
      />

      {/* Deactivate Confirmation */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        title={
          confirmDeactivate?.is_active
            ? 'Desactivar documento'
            : 'Reactivar documento'
        }
        message={
          confirmDeactivate?.is_active
            ? `¿Desactivar "${confirmDeactivate?.title}"? Los empleados no podrán verlo.`
            : `¿Reactivar "${confirmDeactivate?.title}"?`
        }
        confirmLabel={confirmDeactivate?.is_active ? 'Desactivar' : 'Reactivar'}
        danger={confirmDeactivate?.is_active}
        onConfirm={handleDeactivateConfirmed}
        onCancel={() => setConfirmDeactivate(null)}
      />

      {/* Unpublish Confirmation */}
      <ConfirmDialog
        open={!!confirmUnpublish}
        title="Despublicar documento"
        message={`¿Despublicar "${confirmUnpublish?.title}"? Los empleados perderán acceso inmediatamente.`}
        confirmLabel="Despublicar"
        danger
        onConfirm={handleUnpublishConfirmed}
        onCancel={() => setConfirmUnpublish(null)}
      />

      {/* Acknowledgments Side Panel Overlay */}
      {ackPanelDoc && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setAckPanelDoc(null)}
          />
          <AcknowledgmentsPanel
            document={ackPanelDoc}
            totalEmployees={totalEmployees}
            onClose={() => setAckPanelDoc(null)}
          />
        </>
      )}
    </>
  )
}
