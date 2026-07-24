'use client'

import { useState, useMemo } from 'react'
import {
  Shield,
  Shirt,
  Clock,
  HardHat,
  Monitor,
  Users,
  TrendingUp,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/dates'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  version: string | null
  is_active: boolean
  is_mandatory: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

interface Props {
  documents: PolicyDocument[]
  myAcknowledgments: { document_id: string; acknowledged_at: string }[]
  currentUserId: string
}

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<PolicyCategory, string> = {
  conduct: 'Código de Conducta',
  dress_code: 'Código de Vestimenta',
  absenteeism: 'Ausentismo',
  safety: 'Seguridad e Higiene',
  it: 'Tecnología',
  hr: 'Recursos Humanos',
  commercial: 'Comercial',
  other: 'Otros',
}

const CATEGORY_ICON: Record<PolicyCategory, LucideIcon> = {
  conduct: Shield,
  dress_code: Shirt,
  absenteeism: Clock,
  safety: HardHat,
  it: Monitor,
  hr: Users,
  commercial: TrendingUp,
  other: FileText,
}

const CATEGORY_BORDER: Record<PolicyCategory, string> = {
  conduct: 'border-l-blue-600',
  dress_code: 'border-l-purple-500',
  absenteeism: 'border-l-orange-500',
  safety: 'border-l-yellow-500',
  it: 'border-l-cyan-500',
  hr: 'border-l-green-600',
  commercial: 'border-l-brand-600',
  other: 'border-l-gray-400',
}

const CATEGORY_ICON_COLOR: Record<PolicyCategory, string> = {
  conduct: 'text-blue-600',
  dress_code: 'text-purple-500',
  absenteeism: 'text-orange-500',
  safety: 'text-yellow-500',
  it: 'text-cyan-500',
  hr: 'text-green-600',
  commercial: 'text-brand-600',
  other: 'text-gray-400',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Document Card ────────────────────────────────────────────────────────────

interface DocumentCardProps {
  doc: PolicyDocument
  isAcknowledged: boolean
  currentUserId: string
  onAcknowledge: (documentId: string, acknowledgedAt: string) => void
}

function DocumentCard({
  doc,
  isAcknowledged,
  currentUserId,
  onAcknowledge,
}: DocumentCardProps) {
  const [downloading, setDownloading] = useState(false)
  const [acknowledging, setAcknowledging] = useState(false)

  const supabase = createClient()

  async function handleDownload() {
    if (!doc.file_path) return
    setDownloading(true)
    try {
      const { data, error } = await supabase.storage
        .from('policies')
        .createSignedUrl(doc.file_path, 300)

      if (error || !data?.signedUrl) {
        toast.error('No se pudo generar el enlace de descarga.')
        return
      }

      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch {
      toast.error('Error al intentar descargar el documento.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleAcknowledge() {
    setAcknowledging(true)
    try {
      const now = new Date().toISOString()

      const { error } = await supabase.from('policy_acknowledgments').insert({
        document_id: doc.id,
        employee_id: currentUserId,
        acknowledged_at: now,
      })

      if (error) {
        // If duplicate (already acknowledged by a race condition), treat as success
        if (error.code === '23505') {
          onAcknowledge(doc.id, now)
          toast.success('Ya habías marcado este documento como leído.')
        } else {
          toast.error('No se pudo registrar la confirmación. Intentá de nuevo.')
        }
        return
      }

      onAcknowledge(doc.id, now)
      toast.success(`"${doc.title}" marcado como leído.`)
    } catch {
      toast.error('Error al registrar la confirmación.')
    } finally {
      setAcknowledging(false)
    }
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-base leading-snug">
              {doc.title}
            </h3>
            {doc.version && (
              <span className="badge text-xs font-mono bg-gray-100 text-gray-500 border border-gray-200">
                v{doc.version}
              </span>
            )}
          </div>

          {doc.description && (
            <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
              {doc.description}
            </p>
          )}
        </div>

        {/* Status badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {doc.is_mandatory && (
            <span className="badge bg-amber-100 text-amber-800 border border-amber-200 text-xs font-medium">
              Obligatorio
            </span>
          )}
          {isAcknowledged && (
            <span className="badge bg-green-100 text-green-700 border border-green-200 text-xs font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Leído ✓
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
        {doc.published_at && (
          <span>Publicado: {formatDate(doc.published_at)}</span>
        )}
        {doc.file_size && doc.file_size > 0 && (
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {formatFileSize(doc.file_size)}
          </span>
        )}
      </div>

      {/* Actions */}
      {(doc.file_path || (doc.is_mandatory && !isAcknowledged)) && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {doc.file_path && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className={cn('btn-secondary text-sm flex items-center gap-1.5', {
                'opacity-60 cursor-not-allowed': downloading,
              })}
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Descargando…' : 'Descargar'}
            </button>
          )}

          {doc.is_mandatory && !isAcknowledged && (
            <button
              type="button"
              onClick={handleAcknowledge}
              disabled={acknowledging}
              className={cn('btn-primary text-sm flex items-center gap-1.5', {
                'opacity-60 cursor-not-allowed': acknowledging,
              })}
            >
              <CheckCircle2 className="w-4 h-4" />
              {acknowledging ? 'Registrando…' : 'Marcar como leído'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function PoliciesClientPage({
  documents,
  myAcknowledgments,
  currentUserId,
}: Props) {
  // Local acknowledgment state (optimistic updates)
  const [localAcks, setLocalAcks] = useState<
    { document_id: string; acknowledged_at: string }[]
  >(myAcknowledgments)

  function handleAcknowledge(documentId: string, acknowledgedAt: string) {
    setLocalAcks((prev) => {
      if (prev.some((a) => a.document_id === documentId)) return prev
      return [...prev, { document_id: documentId, acknowledged_at: acknowledgedAt }]
    })
  }

  const acknowledgedIds = useMemo(
    () => new Set(localAcks.map((a) => a.document_id)),
    [localAcks]
  )

  // Group documents by category, preserving sorted order
  const grouped = useMemo(() => {
    const map = new Map<PolicyCategory, PolicyDocument[]>()
    for (const doc of documents) {
      const list = map.get(doc.category) ?? []
      list.push(doc)
      map.set(doc.category, list)
    }
    return map
  }, [documents])

  // Mandatory unread docs
  const mandatoryUnread = useMemo(
    () =>
      documents.filter(
        (d) => d.is_mandatory && !acknowledgedIds.has(d.id)
      ),
    [documents, acknowledgedIds]
  )

  const isEmpty = documents.length === 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Políticas y Códigos Internos
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Documentos vigentes de BYD Simone
        </p>
      </div>

      {/* Mandatory unread banner */}
      {mandatoryUnread.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 font-medium">
            Tenés{' '}
            <span className="font-bold">{mandatoryUnread.length}</span>{' '}
            política{mandatoryUnread.length === 1 ? '' : 's'} obligatoria
            {mandatoryUnread.length === 1 ? '' : 's'} pendiente
            {mandatoryUnread.length === 1 ? '' : 's'} de confirmación.
          </p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="empty-state flex flex-col items-center gap-3 py-16 text-center">
          <FileText className="w-12 h-12 text-gray-300" />
          <p className="text-gray-500 font-medium">
            No hay políticas publicadas por el momento.
          </p>
          <p className="text-sm text-gray-400">
            Volvé más tarde para ver los documentos vigentes.
          </p>
        </div>
      )}

      {/* Grouped sections */}
      {!isEmpty &&
        Array.from(grouped.entries()).map(([category, docs]) => {
          const Icon = CATEGORY_ICON[category]
          const label = CATEGORY_LABEL[category]
          const borderClass = CATEGORY_BORDER[category]
          const iconClass = CATEGORY_ICON_COLOR[category]

          return (
            <section key={category} className="space-y-3">
              {/* Section header */}
              <div
                className={cn(
                  'flex items-center gap-2 border-l-4 pl-3 py-0.5',
                  borderClass
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', iconClass)} />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                  {label}
                </h2>
                <span className="ml-auto text-xs text-gray-400">
                  {docs.length} documento{docs.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Document cards */}
              <div className="grid gap-3 sm:grid-cols-1">
                {docs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    isAcknowledged={acknowledgedIds.has(doc.id)}
                    currentUserId={currentUserId}
                    onAcknowledge={handleAcknowledge}
                  />
                ))}
              </div>
            </section>
          )
        })}
    </div>
  )
}
