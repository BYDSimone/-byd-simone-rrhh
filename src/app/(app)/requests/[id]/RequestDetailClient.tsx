'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, MessageSquare,
  Upload, FileText, Loader2, Clock, User, Calendar, Info, Paperclip
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatDateTime, formatRelative, formatDateRange, getAntiguedad } from '@/lib/utils/dates'
import { STATUS_LABELS, ROLE_LABELS, SUCURSAL_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Request, AuditLog, UserRole } from '@/lib/types'

interface Props {
  request:       Request & { employee: any; benefit_type: any; reviewer: any; medical_certificates: any[] }
  auditLogs:     AuditLog[]
  currentUserId: string
  currentRole:   UserRole
}

export function RequestDetailClient({ request, auditLogs, currentUserId, currentRole }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const isOwner    = request.employee_id === currentUserId
  const isHrAdmin  = currentRole === 'hr_admin'
  const isLeaderUp = ['leader','manager','hr_admin'].includes(currentRole)
  const canReview  = isLeaderUp && !isOwner && request.status === 'pending'
  const canCancel  = isOwner && request.status === 'pending'
  const canUploadCert = (isOwner || isHrAdmin) && request.benefit_type?.requires_certificate

  const [comment,    setComment]    = useState('')
  const [uploading,  setUploading]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [action,     setAction]     = useState<'approve' | 'reject' | 'needs_info' | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleReview(newStatus: 'approved' | 'rejected' | 'needs_info') {
    if (newStatus === 'rejected' && !comment.trim()) {
      toast.error('Ingresá un comentario para rechazar la solicitud.')
      return
    }
    setSubmitting(true)
    const { error } = await supabase
      .from('requests')
      .update({ status: newStatus, reviewer_id: currentUserId, reviewer_comment: comment || null, reviewed_at: new Date().toISOString() })
      .eq('id', request.id)

    if (error) { toast.error(error.message); setSubmitting(false); return }

    const msgs: Record<string, string> = {
      approved:   'Solicitud aprobada.',
      rejected:   'Solicitud rechazada.',
      needs_info: 'Se solicitó información adicional.',
    }
    toast.success(msgs[newStatus])
    router.refresh()
    setSubmitting(false)
    setAction(null)
  }

  async function handleCancel() {
    setSubmitting(true)
    const { error } = await supabase
      .from('requests')
      .update({ status: 'cancelled' })
      .eq('id', request.id)

    if (error) { toast.error(error.message); setSubmitting(false); return }
    toast.success('Solicitud cancelada.')
    router.push('/requests')
  }

  async function handleCertUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const maxSize = 10 * 1024 * 1024  // 10MB
    if (file.size > maxSize) { toast.error('El archivo no puede superar 10MB.'); return }

    setUploading(true)
    const path = `certificates/${new Date().getFullYear()}/${request.employee_id}/${request.id}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) { toast.error('Error al subir el archivo.'); setUploading(false); return }

    const { error: dbError } = await supabase
      .from('medical_certificates')
      .insert({
        request_id:  request.id,
        employee_id: request.employee_id,
        file_path:   path,
        file_name:   file.name,
        file_type:   file.type,
        file_size:   file.size,
        valid_from:  request.start_date,
      })

    if (dbError) { toast.error('Error al registrar el certificado.'); setUploading(false); return }

    toast.success('Certificado adjuntado correctamente.')
    router.refresh()
    setUploading(false)
  }

  function statusConfig(status: string) {
    return {
      pending:    { cls: 'badge-pending',    label: STATUS_LABELS.pending    },
      approved:   { cls: 'badge-approved',   label: STATUS_LABELS.approved   },
      rejected:   { cls: 'badge-rejected',   label: STATUS_LABELS.rejected   },
      cancelled:  { cls: 'badge-cancelled',  label: STATUS_LABELS.cancelled  },
      needs_info: { cls: 'badge-needs_info', label: STATUS_LABELS.needs_info },
    }[status] ?? { cls: 'badge', label: status }
  }

  const sc = statusConfig(request.status)
  const emp = request.employee
  const bt  = request.benefit_type

  async function getSignedUrl(path: string) {
    const { data } = await supabase.storage.from('certificates').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    else toast.error('No se pudo abrir el archivo.')
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Back */}
      <Link href="/requests" className="btn-ghost btn-sm mb-6 inline-flex">
        <ArrowLeft size={16} /> Solicitudes
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Header de la solicitud */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bt?.color }} />
                  <h1 className="text-xl font-bold tracking-tight">{bt?.name}</h1>
                </div>
                <p className="text-text-muted text-sm">
                  {formatDateRange(request.start_date, request.end_date)}
                  {request.days_count != null && (
                    <> · <strong>{request.days_count}</strong> día{request.days_count !== 1 ? 's' : ''} hábil{request.days_count !== 1 ? 'es' : ''}</>
                  )}
                  {request.is_half_day && <> · Medio día ({request.half_day_period === 'morning' ? 'mañana' : 'tarde'})</>}
                </p>
              </div>
              <span className={sc.cls}>{sc.label}</span>
            </div>

            {/* Motivo */}
            {request.reason && (
              <div className="bg-surface-subtle rounded-lg p-3 text-sm text-text-secondary">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Motivo</p>
                <p>"{request.reason}"</p>
              </div>
            )}

            {/* Comentario del revisor */}
            {request.reviewer_comment && (
              <div className={cn('rounded-lg p-3 mt-3 text-sm', {
                'bg-emerald-50 border border-emerald-200': request.status === 'approved',
                'bg-red-50 border border-red-200':        request.status === 'rejected',
                'bg-violet-50 border border-violet-200':  request.status === 'needs_info',
              })}>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                  Comentario de {request.reviewer?.full_name ?? 'Revisor'}
                </p>
                <p>"{request.reviewer_comment}"</p>
                {request.reviewed_at && (
                  <p className="text-xs text-text-muted mt-1">{formatRelative(request.reviewed_at)}</p>
                )}
              </div>
            )}
          </div>

          {/* Certificados médicos */}
          {bt?.requires_certificate && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">Certificados médicos</h2>
                {canUploadCert && (
                  <>
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="btn-secondary btn-sm"
                    >
                      {uploading
                        ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                        : <><Upload size={14} /> Adjuntar</>}
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={handleCertUpload}
                    />
                  </>
                )}
              </div>

              {request.medical_certificates.length === 0 ? (
                <div className="text-center py-6 text-text-muted">
                  <Paperclip size={28} className="mx-auto mb-2 text-border-strong" />
                  <p className="text-sm">No hay certificados adjuntos aún.</p>
                  {canUploadCert && (
                    <p className="text-xs mt-1">Adjuntá el certificado médico para completar la solicitud.</p>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {request.medical_certificates.map((cert: any) => (
                    <li key={cert.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-surface-subtle transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText size={16} className="text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{cert.file_name}</p>
                        <p className="text-xs text-text-muted">
                          Subido {formatRelative(cert.uploaded_at)}
                          {cert.valid_from && ` · Válido desde ${formatDate(cert.valid_from)}`}
                          {cert.valid_until && ` hasta ${formatDate(cert.valid_until)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => getSignedUrl(cert.file_path)}
                        className="btn-ghost btn-sm text-brand-600"
                      >
                        Ver
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Panel de acciones (líder/manager/HR) */}
          {canReview && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold mb-4">Revisar solicitud</h2>

              <textarea
                rows={3}
                className="form-input resize-none mb-4"
                placeholder="Comentario (obligatorio para rechazar, opcional para aprobar)..."
                value={comment}
                onChange={e => setComment(e.target.value)}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleReview('approved')}
                  disabled={submitting}
                  className="btn-primary flex-1 justify-center"
                >
                  {submitting && action === 'approve'
                    ? <Loader2 size={15} className="animate-spin" />
                    : <CheckCircle size={15} />}
                  Aprobar
                </button>
                <button
                  onClick={() => handleReview('needs_info')}
                  disabled={submitting}
                  className="btn bg-violet-600 text-white hover:bg-violet-700 flex-1 justify-center"
                >
                  <Info size={15} /> Pedir info
                </button>
                <button
                  onClick={() => handleReview('rejected')}
                  disabled={submitting}
                  className="btn-danger flex-1 justify-center"
                >
                  <XCircle size={15} /> Rechazar
                </button>
              </div>
            </div>
          )}

          {/* Cancelar (empleado) */}
          {canCancel && (
            <div className="card p-4 border-border">
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="btn-secondary text-status-rejected hover:bg-red-50 hover:border-red-200 w-full justify-center"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Cancelar mi solicitud
              </button>
            </div>
          )}

          {/* Timeline de auditoría */}
          {auditLogs.length > 0 && (
            <div className="card p-5">
              <h2 className="text-sm font-semibold mb-4">Historial de actividad</h2>
              <div className="space-y-4">
                {auditLogs.map((log, i) => {
                  const newVals = log.new_values as any
                  const oldVals = log.old_values as any
                  const statusChanged = newVals?.status && oldVals?.status !== newVals?.status
                  return (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-6 h-6 rounded-full bg-surface-raised border-2 border-border flex items-center justify-center">
                          <Clock size={10} className="text-text-muted" />
                        </div>
                        {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                      </div>
                      <div className="pb-4 min-w-0 flex-1">
                        <p className="text-sm text-text-secondary">
                          <strong className="text-text-primary">{log.user_name ?? 'Sistema'}</strong>
                          {log.action === 'create' && ' creó la solicitud'}
                          {log.action === 'update' && statusChanged && (
                            <> cambió el estado a <span className={`badge-${newVals.status} text-xs`}>{STATUS_LABELS[newVals.status as keyof typeof STATUS_LABELS]}</span></>
                          )}
                          {log.action === 'update' && !statusChanged && ' actualizó la solicitud'}
                        </p>
                        {newVals?.reviewer_comment && statusChanged && (
                          <p className="text-xs text-text-muted mt-0.5 italic">"{newVals.reviewer_comment}"</p>
                        )}
                        <p className="text-xs text-text-muted mt-0.5">{formatRelative(log.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Sidebar derecha: info del empleado ── */}
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Colaborador</h2>

            {/* Avatar + nombre */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                {emp?.avatar_url
                  ? <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-brand-700">{emp?.full_name?.split(' ').map((n: string) => n[0]).slice(0,2).join('')}</span>
                }
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">{emp?.full_name}</p>
                <p className="text-xs text-text-muted">{emp?.position ?? 'Sin cargo asignado'}</p>
              </div>
            </div>

            <dl className="space-y-2.5 text-sm">
              {emp?.area && (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.area.color }} />
                  <span className="text-text-muted text-xs">Área</span>
                  <span className="font-medium ml-auto">{emp.area.name}</span>
                </div>
              )}
              {emp?.sucursal && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Sucursal</span>
                  <span className="font-medium">{SUCURSAL_LABELS[emp.sucursal as keyof typeof SUCURSAL_LABELS]}</span>
                </div>
              )}
              {emp?.hire_date && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Antigüedad</span>
                  <span className="font-medium">{getAntiguedad(emp.hire_date)}</span>
                </div>
              )}
            </dl>

            <Link href={`/team/${emp?.id}`} className="btn-secondary btn-sm w-full justify-center mt-4">
              Ver ficha completa
            </Link>
          </div>

          {/* Metadatos de la solicitud */}
          <div className="card p-5">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Detalles</h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-xs">Creada</span>
                <span className="font-medium text-xs">{formatDateTime(request.created_at)}</span>
              </div>
              {request.reviewed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Revisada</span>
                  <span className="font-medium text-xs">{formatRelative(request.reviewed_at)}</span>
                </div>
              )}
              {request.reviewer && (
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs">Revisada por</span>
                  <span className="font-medium text-xs">{request.reviewer.full_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-text-muted text-xs">Estado</span>
                <span className={sc.cls}>{sc.label}</span>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
