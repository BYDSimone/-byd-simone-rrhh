'use client'

import { useState, useMemo } from 'react'
import { Plus, Clock, CheckCircle, XCircle, AlertTriangle, Calendar, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatHours } from '@/lib/utils/dates'
import { OT_STATUS_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { OvertimeRecord, OvertimeBalance, OvertimeCompensation, UserRole } from '@/lib/types'

interface Props {
  initialRecords: OvertimeRecord[]
  myBalance:      OvertimeBalance | null
  compensations:  OvertimeCompensation[]
  leaders:        { id: string; full_name: string }[]
  currentUserId:  string
  currentRole:    UserRole
}

export function OvertimeClientPage({ initialRecords, myBalance, compensations, leaders, currentUserId, currentRole }: Props) {
  const supabase   = createClient()
  const isLeaderUp = ['leader','manager','hr_admin'].includes(currentRole)
  const isHrAdmin  = currentRole === 'hr_admin'

  const [records,     setRecords]     = useState(initialRecords)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterMine,   setFilterMine]   = useState(!isLeaderUp)
  const [tab,          setTab]          = useState<'records' | 'compensations'>('records')
  const [validating,   setValidating]   = useState<string | null>(null)

  const filtered = useMemo(() => records.filter(r => {
    const matchStatus = !filterStatus || r.status === filterStatus
    const matchMine   = !filterMine   || r.employee_id === currentUserId
    return matchStatus && matchMine
  }), [records, filterStatus, filterMine, currentUserId])

  const pendingValidation = records.filter(r =>
    r.status === 'pending_validation' && r.employee_id !== currentUserId
  ).length

  async function handleValidate(id: string, status: 'validated' | 'rejected', comment?: string) {
    setValidating(id)
    const { error } = await supabase
      .from('overtime_records')
      .update({ status, validator_id: currentUserId, validator_comment: comment ?? null, validated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) { toast.error(error.message); setValidating(null); return }

    setRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    toast.success(status === 'validated' ? 'Horas extras validadas.' : 'Registro rechazado.')
    setValidating(null)
  }

  function statusClass(status: string) {
    return {
      pending_validation: 'badge-pending',
      validated:          'badge-validated',
      credited:           'badge-credited',
      rejected:           'badge-rejected',
    }[status] ?? 'badge'
  }

  function breakdownLabel(r: OvertimeRecord) {
    const parts = []
    if (r.hours_50pct  > 0) parts.push(`${formatHours(r.hours_50pct)} al 50%`)
    if (r.hours_100pct > 0) parts.push(`${formatHours(r.hours_100pct)} al 100%`)
    if (r.night_hours  > 0) parts.push(`${formatHours(r.night_hours)} noc.`)
    return parts.join(' + ') || '—'
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Horas Extras</h1>
          <p className="text-sm text-text-muted mt-1">
            {pendingValidation > 0 && isLeaderUp && (
              <span className="text-amber-600 font-medium">
                {pendingValidation} pendiente{pendingValidation !== 1 ? 's' : ''} de validación ·{' '}
              </span>
            )}
            {records.length} registro{records.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/overtime/compensate" className="btn-secondary">
            <ArrowRight size={15} /> Usar horas
          </Link>
          <Link href="/overtime/new" className="btn-primary">
            <Plus size={16} /> Registrar horas
          </Link>
        </div>
      </div>

      {/* Tarjeta de saldo */}
      {myBalance && (
        <div className="card p-5 mb-6">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4">Mi saldo de horas extras</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Disponibles',  value: formatHours(myBalance.available_hours),  color: 'text-brand-600 font-extrabold text-2xl' },
              { label: 'Acreditadas', value: formatHours(myBalance.total_hours),       color: 'text-text-primary text-2xl font-bold' },
              { label: 'Utilizadas',  value: formatHours(myBalance.used_hours),        color: 'text-text-secondary text-xl font-semibold' },
              { label: 'Pendientes',  value: formatHours(myBalance.pending_hours),     color: 'text-amber-600 text-xl font-semibold' },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-lg bg-surface-subtle">
                <p className={item.color}>{item.value}</p>
                <p className="text-xs text-text-muted mt-1">{item.label}</p>
              </div>
            ))}
          </div>
          {/* Equivalencia */}
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-xs text-text-muted">
            <span>≈ <strong className="text-text-primary">{(myBalance.available_hours / 4).toFixed(1)}</strong> medios días</span>
            <span>≈ <strong className="text-text-primary">{(myBalance.available_hours / 8).toFixed(1)}</strong> días completos</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-5">
        {[
          { key: 'records',       label: 'Registros de horas' },
          { key: 'compensations', label: 'Compensaciones solicitadas' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn('px-4 py-2.5 text-sm font-medium border-b-2 transition-colors', {
              'border-brand-600 text-brand-700': tab === t.key,
              'border-transparent text-text-muted hover:text-text-secondary': tab !== t.key,
            })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'records' && (
        <>
          {/* Filtros */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input w-auto">
              <option value="">Todos los estados</option>
              <option value="pending_validation">Pendiente validación</option>
              <option value="validated">Validadas</option>
              <option value="credited">Acreditadas</option>
              <option value="rejected">Rechazadas</option>
            </select>
            {isLeaderUp && (
              <label className="flex items-center gap-2 text-sm cursor-pointer px-1">
                <input type="checkbox" checked={filterMine} onChange={e => setFilterMine(e.target.checked)} className="w-4 h-4 rounded" />
                Solo las mías
              </label>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state card">
              <Clock size={40} className="text-border-strong" />
              <p className="font-semibold text-text-secondary">No hay registros de horas extras</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      {isLeaderUp && <th>Colaborador</th>}
                      <th>Fecha</th>
                      <th>Horario</th>
                      <th>Total</th>
                      <th>Desglose</th>
                      <th>Estado</th>
                      <th>Alertas</th>
                      {isLeaderUp && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id} className="group">
                        {isLeaderUp && (
                          <td>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                                {(r as any).employee?.full_name?.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                              </div>
                              <span className="text-sm font-medium">{(r as any).employee?.full_name}</span>
                            </div>
                          </td>
                        )}
                        <td className="whitespace-nowrap">
                          {formatDate(r.work_date)}
                          <div className="text-xs text-text-muted">
                            {new Date(r.work_date + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short' })}
                          </div>
                        </td>
                        <td className="font-mono text-sm whitespace-nowrap">
                          {r.start_time?.slice(0,5)} → {r.end_time?.slice(0,5)}
                        </td>
                        <td>
                          <span className="font-bold text-text-primary">{formatHours(r.total_hours ?? 0)}</span>
                        </td>
                        <td className="text-xs text-text-muted">{breakdownLabel(r)}</td>
                        <td>
                          <span className={statusClass(r.status)}>
                            {OT_STATUS_LABELS[r.status]}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            {r.exceeds_daily_limit   && <span title="Supera límite diario (3hs)"     className="badge bg-red-50 text-red-600 border-red-200 text-xs">D</span>}
                            {r.exceeds_monthly_limit && <span title="Supera límite mensual (30hs)"   className="badge bg-amber-50 text-amber-600 border-amber-200 text-xs">M</span>}
                            {r.exceeds_annual_limit  && <span title="Supera límite anual (200hs)"    className="badge bg-orange-50 text-orange-600 border-orange-200 text-xs">A</span>}
                          </div>
                        </td>
                        {isLeaderUp && r.employee_id !== currentUserId && r.status === 'pending_validation' && (
                          <td>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleValidate(r.id, 'validated')}
                                disabled={validating === r.id}
                                className="btn-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded px-2 py-1 text-xs font-semibold"
                              >
                                Validar
                              </button>
                              <button
                                onClick={() => handleValidate(r.id, 'rejected')}
                                disabled={validating === r.id}
                                className="btn-sm btn-danger text-xs"
                              >
                                Rechazar
                              </button>
                            </div>
                          </td>
                        )}
                        {isLeaderUp && (r.employee_id === currentUserId || r.status !== 'pending_validation') && <td />}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'compensations' && (
        <>
          {compensations.length === 0 ? (
            <div className="empty-state card">
              <Calendar size={40} className="text-border-strong" />
              <p className="font-semibold text-text-secondary">No hay compensaciones solicitadas</p>
              <p className="text-sm">Podés usar tus horas acreditadas para tomar días libres.</p>
              <Link href="/overtime/compensate" className="btn-primary btn-sm mt-2">
                Solicitar compensación
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {compensations.map(c => (
                <div key={c.id} className="card p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {formatDate(c.start_date)}
                      {c.start_date !== c.end_date && ` → ${formatDate(c.end_date)}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      {formatHours(c.hours_requested)} descontadas del saldo
                      {c.reason && ` · "${c.reason}"`}
                    </p>
                  </div>
                  <span className={cn('badge', {
                    'badge-pending':  c.status === 'pending',
                    'badge-approved': c.status === 'approved',
                    'badge-rejected': c.status === 'rejected',
                  })}>
                    {{ pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada' }[c.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
