import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarClientPage from './CalendarClientPage'
import {
  startOfMonth,
  endOfMonth,
  format,
} from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, area_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const monthStartStr = format(monthStart, 'yyyy-MM-dd')
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

  // Build requests query based on role
  let requestsQuery = supabase
    .from('requests')
    .select(
      `id, start_date, end_date, benefit_type, status, employee_id,
       profiles!requests_employee_id_fkey(id, full_name, area_id)`
    )
    .eq('status', 'approved')
    .lte('start_date', monthEndStr)
    .gte('end_date', monthStartStr)

  if (profile.role === 'collaborator') {
    // Own requests + team (same area)
    const { data: teamIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('area_id', profile.area_id)
    const ids = (teamIds ?? []).map((p: { id: string }) => p.id)
    if (!ids.includes(profile.id)) ids.push(profile.id)
    requestsQuery = requestsQuery.in('employee_id', ids)
  } else if (profile.role === 'leader') {
    const { data: teamIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('area_id', profile.area_id)
    const ids = (teamIds ?? []).map((p: { id: string }) => p.id)
    requestsQuery = requestsQuery.in('employee_id', ids)
  }
  // manager / hr_admin: no filter → all

  const { data: requests } = await requestsQuery

  // Overtime records
  let overtimeQuery = supabase
    .from('overtime_records')
    .select(
      `id, date, hours, type, employee_id,
       profiles!overtime_records_employee_id_fkey(id, full_name)`
    )
    .gte('date', monthStartStr)
    .lte('date', monthEndStr)

  if (profile.role === 'collaborator') {
    overtimeQuery = overtimeQuery.eq('employee_id', profile.id)
  } else if (profile.role === 'leader') {
    const { data: teamIds } = await supabase
      .from('profiles')
      .select('id')
      .eq('area_id', profile.area_id)
    const ids = (teamIds ?? []).map((p: { id: string }) => p.id)
    overtimeQuery = overtimeQuery.in('employee_id', ids)
  }

  const { data: overtime } = await overtimeQuery

  // Upcoming birthdays — filter by month of dob
  const currentMonth = now.getMonth() + 1
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, dob')
    .is('deleted_at', null)

  const birthdays = (allProfiles ?? []).filter((p: { dob: string | null }) => {
    if (!p.dob) return false
    const month = new Date(p.dob).getUTCMonth() + 1
    return month === currentMonth
  })

  return (
    <CalendarClientPage
      currentUserProfile={profile}
      initialRequests={requests ?? []}
      initialOvertime={overtime ?? []}
      birthdays={birthdays}
      serverMonth={now.getMonth()}
      serverYear={now.getFullYear()}
    />
  )
}
