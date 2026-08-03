'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import CalendarClientPage from './CalendarClientPage'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default function CalendarPage() {
  const { profile, userId } = useAppContext()
  const [requests, setRequests] = useState<any[]>([])
  const [overtime, setOvertime] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const now = new Date()

  useEffect(() => {
    if (!userId || !profile) return

    const fetchData = async () => {
      const supabase = createClient()

      const monthStart = startOfMonth(now)
      const monthEnd = endOfMonth(now)
      const monthStartStr = format(monthStart, 'yyyy-MM-dd')
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd')

      let requestsQuery = supabase
        .from('requests')
        .select(
          `id, start_date, end_date, status, employee_id,
           benefit_type:benefit_types(id, name, color, code),
           employee:profiles!requests_employee_id_fkey(id, full_name, area_id)`
        )
        .eq('status', 'approved')
        .lte('start_date', monthEndStr)
        .gte('end_date', monthStartStr)

      if (profile.role === 'collaborator') {
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

      let overtimeQuery = supabase
        .from('overtime_records')
        .select(
          `id, work_date, total_hours, employee_id,
           profiles!overtime_records_employee_id_fkey(id, full_name)`
        )
        .gte('work_date', monthStartStr)
        .lte('work_date', monthEndStr)

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

      const [{ data: requestsData }, { data: overtimeData }, { data: allProfiles }] =
        await Promise.all([
          requestsQuery,
          overtimeQuery,
          supabase.from('profiles').select('id, full_name, birth_date').is('deleted_at', null),
        ])

      const currentMonth = now.getMonth() + 1
      const birthdaysData = (allProfiles ?? []).filter((p: { birth_date: string | null }) => {
        if (!p.birth_date) return false
        const month = new Date(p.birth_date).getUTCMonth() + 1
        return month === currentMonth
      })

      setRequests(requestsData ?? [])
      setOvertime(overtimeData ?? [])
      setBirthdays(birthdaysData)
      setLoading(false)
    }

    fetchData().catch(() => setLoading(false))
  }, [userId, profile])

  if (loading || !profile || !userId) return null

  return (
    <CalendarClientPage
      currentUserProfile={profile}
      initialRequests={requests}
      initialOvertime={overtime}
      birthdays={birthdays}
      serverMonth={now.getMonth()}
      serverYear={now.getFullYear()}
    />
  )
}
