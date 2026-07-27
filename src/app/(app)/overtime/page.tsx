'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { OvertimeClientPage } from './OvertimeClientPage'

export default function OvertimePage() {
  const { profile, userId } = useAppContext()
  const [records, setRecords] = useState<any[]>([])
  const [myBalance, setMyBalance] = useState<any>(null)
  const [compensations, setCompensations] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !profile) return

    const fetchData = async () => {
      const supabase = createClient()

      const isHrAdmin = profile.role === 'hr_admin'
      const isLeaderUp = ['leader', 'manager', 'hr_admin'].includes(profile.role)

      let recordsQuery = supabase
        .from('overtime_records')
        .select(`
          *,
          employee:profiles!overtime_records_employee_id_fkey(id,full_name,avatar_url,area:areas(name,color)),
          authorizer:profiles!overtime_records_authorized_by_fkey(id,full_name),
          validator:profiles!overtime_records_validator_id_fkey(id,full_name)
        `)
        .order('work_date', { ascending: false })
        .limit(200)

      if (!isHrAdmin) {
        if (isLeaderUp) {
          recordsQuery = recordsQuery.or(`employee_id.eq.${userId},employee.leader_id.eq.${userId}`)
        } else {
          recordsQuery = recordsQuery.eq('employee_id', userId)
        }
      }

      const [
        { data: recordsData },
        { data: myBalanceData },
        { data: compensationsData },
        { data: leadersData },
      ] = await Promise.all([
        recordsQuery,
        supabase.from('overtime_balance').select('*').eq('employee_id', userId).single(),
        supabase
          .from('overtime_compensations')
          .select('*, employee:profiles!overtime_compensations_employee_id_fkey(id,full_name)')
          .eq('employee_id', userId)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('profiles')
          .select('id,full_name')
          .in('role', ['leader', 'manager', 'hr_admin'])
          .is('deleted_at', null)
          .order('full_name'),
      ])

      setRecords(recordsData ?? [])
      setMyBalance(myBalanceData ?? null)
      setCompensations(compensationsData ?? [])
      setLeaders(leadersData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [userId, profile])

  if (loading || !profile || !userId) return null

  return (
    <OvertimeClientPage
      initialRecords={records}
      myBalance={myBalance}
      compensations={compensations}
      leaders={leaders}
      currentUserId={userId}
      currentRole={profile.role}
    />
  )
}
