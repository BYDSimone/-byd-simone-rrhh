'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { BalancesClientPage } from './BalancesClientPage'

export default function BalancesPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [employees, setEmployees] = useState<any[]>([])
  const [benefitTypes, setBenefitTypes] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      const [
        { data: empData },
        { data: btData },
        { data: balData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, employee_code, area_id, area:areas!profiles_area_id_fkey(id,name,color)')
          .is('deleted_at', null)
          .eq('status', 'active')
          .order('full_name'),
        supabase
          .from('benefit_types')
          .select('id, code, name, color')
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('benefit_balances')
          .select('*'),
      ])
      setEmployees(empData ?? [])
      setBenefitTypes(btData ?? [])
      setBalances(balData ?? [])
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <BalancesClientPage
      employees={employees}
      benefitTypes={benefitTypes}
      initialBalances={balances}
    />
  )
}
