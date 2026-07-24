'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle, Info } from 'lucide-react'
import Link from 'next/link'
import { formatDate, formatDateRange } from '@/lib/utils/dates'
import { STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { Request, BenefitType, UserRole } from '@/lib/types'

interface Props {
  initialRequests: Request[]
  benefitTypes:    BenefitType[]
  currentUserId:   string
  currentRole:     UserRole
}

const STATUS_OPTS = [
  { value: '',           label: 'Todos los estados' },
  { value: 'pending',    label: 'Pendientes' },
  { value: 'approved',   label: 'Aprobadas' },
  { value: 'rejected',   label: 'Rechazadas' },
  { value: 'cancelled',  label: 'Canceladas' },
  { value: 'needs_info', label: 'Info requerida' },
]

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending:    Clock,
  approved:   CheckCircle,
  rejected:   XCircle,
  cancelled:  XCircle,
  needs_info: Info,
}

export function RequestsClientPage({ initialRequests, benefitTypes, currentUserId, currentRole }: Props) {
  const isLeaderUp = ['leader','manager','hr_admin'].includes(currentRole)

  const [search,     setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterMine,   setFilterMine]   = useState(!isLeaderUp)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return initialRequests.filter(r => {
      const emp = (r as any).employee
      const matchSearch = !q
        || emp?.full_name?.toLowerCase().includes(q)
        || (r as any).benefit_type?.name?.toLowerCase().includes(q)
        || r.reason?.toLowerCase().includes(q)
      const matchStatus = !filterStatus || r.status === filterStatus
      const matchType   = !filterType   || r.benefit_type_id === filterType
      const matchMine   = !filterMine   || r.employee_id === currentUserId
      return matchSearch && matchStatus && matchType && matchMine
    })
  }, [initialRequests, search, filterStatus, filterType, filterMine, currentUserId])

  const pendingCount = initialRequests.filter(r =>
    r.status === 'pending' && (isLeaderUp ? r.employee_id !== currentUserId : true)
  ).length

  function statusClass(status: string) {
    return {
      pending:    'badge-pending',
      approved:   'badge-approved',
      rejected:   'badge-rejected',
      cancelled:  'badge-cancelled',
      needs_info: 'badge-needs_info',
    }[status] ?? 'badge'
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Solicitudes</h1>
          <p className="text-sm text-text-muted mt-1">
            {filtered.length} solicitud{filtered.length !== 1 ? 'es' : ''}
            {pendingCount > 0 && isLeaderUp && (
              <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-medium">
                · {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''} de revisión
              </span>
            )}
          </p>
        </div>
        <Link href="/requests/new" className="btn-primary">
          <Plus size={16} /> Nueva solicitud
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Buscar solicitudes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-9"
            />
          </div>

          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input w-full sm:w-44">
            {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input w-full sm:w-48">
            <option value="">Todos los tipos</option>
            {benefitTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
          </select>

          {isLeaderUp && (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer px-1">
              <input
                type="checkbox"
                checked={filterMine}
                onChange={e => setFilterMine(e.target.checked)}
                className="rounded border-border w-4 h-4 text-brand-600"
              />
              Solo las mías
            </label>
          )}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <FileText size={40} className="text-border-strong" />
          <p className="font-semibold text-text-secondary">No hay solicitudes</p>
          <p className="text-sm">Podés crear una nueva con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const emp      = (req as any).employee
            const bt       = (req as any).benefit_type
            const StatusIcon = STATUS_ICONS[req.status] ?? FileText
            const isPending  = req.status === 'pending'
            const needsReview = isPending && isLeaderUp && req.employee_id !== currentUserId

            return (
              <Link
                key={req.id}
                href={`/requests/${req.id}`}
                className={cn(
                  'card-hover flex items-center gap-4 p-4 block transition-all',
                  needsReview && 'border-amber-200 bg-amber-50/30'
                )}
              >
                {/* Color dot del tipo */}
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${bt?.color ?? '#94A3B8'}18` }}
                >
                  <FileText size={18} style={{ color: bt?.color ?? '#94A3B8' }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary text-sm">{bt?.name ?? 'Solicitud'}</span>
                    {needsReview && (
                      <span className="badge badge-pending text-xs">Requiere tu revisión</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {isLeaderUp && emp && (
                      <span className="text-xs text-text-muted">{emp.full_name}</span>
                    )}
                    <span className="text-xs text-text-muted">
                      {formatDateRange(req.start_date, req.end_date)}
                      {req.days_count != null && ` · ${req.days_count} día${req.days_count !== 1 ? 's' : ''}`}
                    </span>
                    {req.reason && (
                      <span className="text-xs text-text-muted truncate max-w-48">"{req.reason}"</span>
                    )}
                  </div>
                </div>

                {/* Área tag */}
                {isLeaderUp && emp?.area && (
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: emp.area.color }} />
                    <span className="text-xs text-text-muted">{emp.area.name}</span>
                  </div>
                )}

                {/* Fecha */}
                <span className="text-xs text-text-muted whitespace-nowrap hidden md:block flex-shrink-0">
                  {formatDate(req.created_at)}
                </span>

                {/* Status */}
                <span className={`${statusClass(req.status)} flex-shrink-0`}>
                  <StatusIcon size={11} />
                  {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS]}
                </span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
