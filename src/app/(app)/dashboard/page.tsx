import { createClient } from '@/lib/supabase/server'
import {
  Users, Clock, Palmtree, Stethoscope, Gift,
  TrendingUp, AlertCircle, CheckCircle2, Timer
} from 'lucide-react'
import { formatDate, formatHours, isBirthdayToday, isBirthdayTomorrow } from '@/lib/utils/dates'
import { SUCURSAL_LABELS } from '@/lib/types'
import type { TodayAbsence, UpcomingBirthday } from '@/lib/types'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, area:areas(id,name,color)')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  const isHrOrManager = ['hr_admin', 'manager'].includes(profile.role)
  const isLeaderAbove  = ['hr_admin', 'manager', 'leader'].includes(profile.role)
  const today          = new Date().toISOString().split('T')[0]

  // ── Queries paralelas ─────────────────────────────────────
  const [
    { data: todayAbsences },
    { data: pendingRequests },
    { data: myBalance },
    { data: myOvertimeBalance },
    { data: upcomingBirthdays },
    { data: recentRequests },
  ] = await Promise.all([
    // Ausentes hoy
    supabase.from('v_today_absences').select('*'),

    // Solicitudes pendientes (según rol)
    isLeaderAbove
      ? supabase.from('requests').select('id', { count: 'exact', head: false }).eq('status', 'pending')
      : supabase.from('requests').select('id').eq('employee_id', user.id).eq('status', 'pending'),

    // Saldo propio de Días Libres Simone
    supabase
      .from('benefit_balances')
      .select('*, benefit_type:benefit_types(code,name,color)')
      .eq('employee_id', user.id)
      .eq('year', new Date().getFullYear()),

    // Saldo horas extras propio
    supabase.from('overtime_balance').select('*').eq('employee_id', user.id).single(),

    // Próximos cumpleaños (HR/gerentes ven todos, otros solo su área)
    isHrOrManager
      ? supabase.from('v_upcoming_birthdays').select('*').limit(5)
      : supabase.from('v_upcoming_birthdays').select('*')
          .limit(3),

    // Últimas solicitudes propias
    supabase
      .from('requests')
      .select('*, benefit_type:benefit_types(name,color,code)')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const simoneBalance = myBalance?.find(b => (b as any).benefit_type?.code === 'SIMONE_DAY')
  const vacationBalance = myBalance?.find(b => (b as any).benefit_type?.code === 'VACATION')
  const onVacation = (todayAbsences as TodayAbsence[] ?? []).filter(a => a.benefit_code === 'VACATION').length
  const sickToday  = (todayAbsences as TodayAbsence[] ?? []).filter(a => a.benefit_code === 'SICK_LEAVE').length
  const otherAbsences = (todayAbsences as TodayAbsence[] ?? []).filter(a => !['VACATION','SICK_LEAVE'].includes(a.benefit_code)).length

  function statusBadge(status: string) {
    const map: Record<string, string> = {
      pending:    'badge-pending',
      approved:   'badge-approved',
      rejected:   'badge-rejected',
      cancelled:  'badge-cancelled',
      needs_info: 'badge-needs_info',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada',
      cancelled: 'Cancelada', needs_info: 'Info requerida',
    }
    return { cls: map[status] ?? 'badge', label: labels[status] ?? status }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">
          Buenos días, {profile.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-text-muted text-sm mt-1">
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {profile.sucursal && ` · Sucursal ${SUCURSAL_LABELS[profile.sucursal as keyof typeof SUCURSAL_LABELS]}`}
        </p>
      </div>

      {/* KPI Cards — Ausencias del día (HR/líderes) */}
      {isLeaderAbove && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
            Hoy · {formatDate(today)}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Ausentes hoy</span>
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Users size={16} className="text-status-rejected" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{(todayAbsences ?? []).length}</p>
                <p className="text-xs text-text-muted mt-0.5">colaboradores</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Vacaciones</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Palmtree size={16} className="text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{onVacation}</p>
                <p className="text-xs text-text-muted mt-0.5">de vacaciones</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Licencias médicas</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Stethoscope size={16} className="text-amber-600" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{sickToday}</p>
                <p className="text-xs text-text-muted mt-0.5">enfermedades</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wide">Solicitudes pend.</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <AlertCircle size={16} className="text-violet-600" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight">{pendingRequests?.length ?? 0}</p>
                <p className="text-xs text-text-muted mt-0.5">por revisar</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Col izq: Mis saldos + últimas solicitudes */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mis saldos */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-4">Mis saldos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Días Libres Simone */}
              <div className="rounded-lg border border-border p-4 bg-surface-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-brand-600" />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Días Libres Simone</span>
                </div>
                {simoneBalance ? (
                  <div className="space-y-2">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{simoneBalance.available}</span>
                      <span className="text-sm text-text-muted mb-0.5">/ {simoneBalance.total_granted} disponibles</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full transition-all"
                        style={{ width: `${(simoneBalance.used / Math.max(simoneBalance.total_granted, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Utilizados: {simoneBalance.used}</span>
                      <span>Pendientes: {simoneBalance.pending}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Sin saldo asignado para {new Date().getFullYear()}</p>
                )}
              </div>

              {/* Vacaciones */}
              <div className="rounded-lg border border-border p-4 bg-surface-subtle">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Vacaciones</span>
                </div>
                {vacationBalance ? (
                  <div className="space-y-2">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold">{vacationBalance.available}</span>
                      <span className="text-sm text-text-muted mb-0.5">/ {vacationBalance.total_granted} días</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(vacationBalance.used / Math.max(vacationBalance.total_granted, 1)) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-text-muted">
                      <span>Tomados: {vacationBalance.used}</span>
                      <span>Pendiente: {vacationBalance.pending}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Sin saldo asignado para {new Date().getFullYear()}</p>
                )}
              </div>

              {/* Horas extras */}
              <div className="rounded-lg border border-border p-4 bg-surface-subtle sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Horas Extras</span>
                </div>
                {myOvertimeBalance ? (
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[
                      { label: 'Acreditadas', value: formatHours(myOvertimeBalance.total_hours), color: 'text-text-primary' },
                      { label: 'Disponibles',  value: formatHours(myOvertimeBalance.available_hours), color: 'text-emerald-600 font-bold' },
                      { label: 'Utilizadas',   value: formatHours(myOvertimeBalance.used_hours), color: 'text-text-secondary' },
                      { label: 'Pendientes',   value: formatHours(myOvertimeBalance.pending_hours), color: 'text-amber-600' },
                    ].map(item => (
                      <div key={item.label}>
                        <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-text-muted">{item.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">Sin horas extras registradas.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <a href="/requests/new" className="btn-primary btn-sm flex-1 justify-center">
                + Nueva solicitud
              </a>
              <a href="/overtime/new" className="btn-secondary btn-sm flex-1 justify-center">
                + Registrar horas
              </a>
            </div>
          </div>

          {/* Últimas solicitudes */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Mis solicitudes recientes</h2>
              <a href="/requests" className="text-xs text-brand-600 hover:underline">Ver todas</a>
            </div>
            {(recentRequests ?? []).length === 0 ? (
              <div className="empty-state py-10">
                <CheckCircle2 size={32} className="text-border-strong" />
                <p className="text-sm">No tenés solicitudes aún.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {(recentRequests ?? []).map((req: any) => {
                  const { cls, label } = statusBadge(req.status)
                  return (
                    <li key={req.id}>
                      <a href={`/requests/${req.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-subtle transition-colors">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: req.benefit_type?.color ?? '#94A3B8' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {req.benefit_type?.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` → ${formatDate(req.end_date)}`}
                          </p>
                        </div>
                        <span className={cls}>{label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Col der: Ausentes hoy + Cumpleaños */}
        <div className="space-y-6">

          {/* Ausentes hoy (detalle) */}
          {isLeaderAbove && (todayAbsences ?? []).length > 0 && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">Ausentes hoy</h2>
                <a href="/calendar" className="text-xs text-brand-600 hover:underline">Calendario</a>
              </div>
              <ul className="divide-y divide-border">
                {(todayAbsences as TodayAbsence[] ?? []).slice(0, 8).map(absence => (
                  <li key={absence.request_id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex-shrink-0 flex items-center justify-center">
                      {absence.avatar_url ? (
                        <img src={absence.avatar_url} alt={absence.full_name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-brand-700">
                          {absence.full_name.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{absence.full_name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: absence.benefit_color }} />
                        <span className="text-xs text-text-muted">{absence.benefit_name}</span>
                      </div>
                    </div>
                  </li>
                ))}
                {(todayAbsences ?? []).length > 8 && (
                  <li className="px-5 py-3 text-xs text-text-muted text-center">
                    +{(todayAbsences ?? []).length - 8} más
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Próximos cumpleaños */}
          {(upcomingBirthdays ?? []).length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-semibold">🎂 Próximos cumpleaños</h2>
              </div>
              <ul className="divide-y divide-border">
                {(upcomingBirthdays as UpcomingBirthday[] ?? []).map(b => {
                  const isToday = isBirthdayToday(b.next_birthday)
                  const isTomorrow = isBirthdayTomorrow(b.next_birthday)
                  return (
                    <li key={b.id} className={`flex items-center gap-3 px-5 py-3 ${isToday ? 'bg-amber-50' : ''}`}>
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                        {b.avatar_url ? (
                          <img src={b.avatar_url} alt={b.full_name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-amber-700">
                            {b.full_name.split(' ').map((n: string) => n[0]).slice(0,2).join('')}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{b.full_name}</p>
                        <p className="text-xs text-text-muted">{b.area_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {isToday
                          ? <span className="badge bg-amber-100 text-amber-700 border-amber-200">¡Hoy!</span>
                          : isTomorrow
                          ? <span className="badge bg-orange-50 text-orange-600 border-orange-200">Mañana</span>
                          : <span className="text-xs text-text-muted whitespace-nowrap">{formatDate(b.next_birthday, 'd MMM')}</span>
                        }
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
