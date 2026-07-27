'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { RequestsClientPage } from './RequestsClientPage'

export default function RequestsPage() {
  const { profile, userId } = useAppContext()
  const [requests, setRequests] = useState<any[]>([])
  const [benefitTypes, setBenefitTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !profile) return

    const fetchData = async () => {
      const supabase = createClient()

      const isHrAdmin = profile.role === 'hr_admin'
      const isLeaderUp = ['leader', 'manager', 'hr_admin'].includes(profile.role)

      // HR ve todo; líder ve su equipo; colaborador ve las propias
      let query = supabase
        .from('requests')
        .select(`
          *,
          employee:profiles!requests_employee_id_fkey(id, full_name, avatar_url, area_id, area:areas(name,color)),
          benefit_type:benefit_types(id, name, color, code, requires_certificate),
          reviewer:profiles!requests_reviewer_id_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!isHrAdmin) {
        if (isLeaderUp) {
          query = query.or(`employee_id.eq.${userId},employee.leader_id.eq.${userId}`)
        } else {
          query = query.eq('employee_id', userId)
        }
      }

      const [{ data: requestsData }, { data: benefitTypesData }] = await Promise.all([
        query,
        supabase
          .from('benefit_types')
          .select('id, name, color, code')
          .eq('is_active', true)
          .order('sort_order'),
      ])

      setRequests(requestsData ?? [])
      setBenefitTypes(benefitTypesData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [userId, profile])

  if (loading || !profile || !userId) return null

  return (
    <RequestsClientPage
      initialRequests={requests}
      benefitTypes={benefitTypes}
      currentUserId={userId}
      currentRole={profile.role}
    />
  )
}
