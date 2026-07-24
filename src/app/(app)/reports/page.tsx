import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReportsClientPage from './ReportsClientPage'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Only hr_admin and manager can access reports
  if (!['hr_admin', 'manager'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const now = new Date()

  // ── Absenteeism last 12 months ──────────────────────────────────────────
  const twelveMonthsAgo = startOfMonth(subMonths(now, 11))
  const twelveMonthsAgoStr = format(twelveMonthsAgo, 'yyyy-MM-dd')
  const nowStr = format(endOfMonth(now), 'yyyy-MM-dd')

  const { data: absRequests } = await supabase
    .from('requests')
    .select(
      `id, start_date, end_date, benefit_type, status, employee_id,
       profiles!requests_employee_id_fkey(id, full_name, area_id,
         areas(id, name)
       )`
    )
    .eq('status', 'approved')
    .gte('start_date', twelveMonthsAgoStr)
    .lte('start_date', nowStr)

  // ── Overtime summary by employee ────────────────────────────────────────
  const { data: overtimeRecords } = await supabase
    .from('overtime_records')
    .select(
      `id, date, hours, type, employee_id,
       profiles!overtime_records_employee_id_fkey(id, full_name, area_id)`
    )
    .gte('date', twelveMonthsAgoStr)
    .lte('date', nowStr)

  // ── Balance summary: employees with low vacation balance ─────────────────
  const { data: balances } = await supabase
    .from('balances')
    .select(
      `id, employee_id, benefit_type, remaining_days,
       profiles!balances_employee_id_fkey(id, full_name, area_id,
         areas(id, name)
       )`
    )

  // ── Pending requests count by type ───────────────────────────────────────
  const { data: pendingRequests } = await supabase
    .from('requests')
    .select('id, benefit_type, status')
    .eq('status', 'pending')

  return (
    <ReportsClientPage
      absRequests={absRequests ?? []}
      overtimeRecords={overtimeRecords ?? []}
      balances={balances ?? []}
      pendingRequests={pendingRequests ?? []}
      currentRole={profile.role}
    />
  )
}
