'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import ReportsClientPage from './ReportsClientPage'
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

export default function ReportsPage() {
  const { profile, userId } = useAppContext()
  const router = useRouter()
  const [absRequests, setAbsRequests] = useState<any[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !profile) return

    // Only hr_admin and manager can access reports
    if (!['hr_admin', 'manager'].includes(profile.role)) {
      router.push('/dashboard')
      return
    }

    const fetchData = async () => {
      const supabase = createClient()

      const now = new Date()
      const twelveMonthsAgo = startOfMonth(subMonths(now, 11))
      const twelveMonthsAgoStr = format(twelveMonthsAgo, 'yyyy-MM-dd')
      const nowStr = format(endOfMonth(now), 'yyyy-MM-dd')

      const [
        { data: absRequestsData },
        { data: overtimeRecordsData },
        { data: balancesData },
        { data: pendingRequestsData },
      ] = await Promise.all([
        // ── Absenteeism last 12 months ──────────────────────────────────────────
        supabase
          .from('requests')
          .select(
            `id, start_date, end_date, benefit_type, status, employee_id,
             profiles!requests_employee_id_fkey(id, full_name, area_id,
               areas(id, name)
             )`
          )
          .eq('status', 'approved')
          .gte('start_date', twelveMonthsAgoStr)
          .lte('start_date', nowStr),

        // ── Overtime summary by employee — fixed field names: work_date, total_hours ──
        supabase
          .from('overtime_records')
          .select(
            `id, work_date, total_hours, type, employee_id,
             profiles!overtime_records_employee_id_fkey(id, full_name, area_id)`
          )
          .gte('work_date', twelveMonthsAgoStr)
          .lte('work_date', nowStr),

        // ── Balance summary — fixed table name: benefit_balances ─────────────────
        supabase
          .from('benefit_balances')
          .select(
            `id, employee_id, benefit_type, remaining_days,
             profiles!benefit_balances_employee_id_fkey(id, full_name, area_id,
               areas(id, name)
             )`
          ),

        // ── Pending requests count by type ───────────────────────────────────────
        supabase
          .from('requests')
          .select('id, benefit_type, status')
          .eq('status', 'pending'),
      ])

      setAbsRequests(absRequestsData ?? [])
      setOvertimeRecords(overtimeRecordsData ?? [])
      setBalances(balancesData ?? [])
      setPendingRequests(pendingRequestsData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [userId, profile, router])

  if (loading || !profile || !userId) return null

  return (
    <ReportsClientPage
      absRequests={absRequests}
      overtimeRecords={overtimeRecords}
      balances={balances}
      pendingRequests={pendingRequests}
      currentRole={profile.role}
    />
  )
}
