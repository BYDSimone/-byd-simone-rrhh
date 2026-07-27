'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import BenefitTypesClientPage from './BenefitTypesClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BenefitType {
  id: string
  name: string
  description: string | null
  max_days_per_year: number | null
  is_active: boolean
  requires_certificate: boolean
  allow_half_day: boolean
  needs_approval: boolean
  color: string | null
  sort_order: number
  created_at: string
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function BenefitTypesPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [benefitTypes, setBenefitTypes] = useState<BenefitType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      const { data } = await supabase
        .from('benefit_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      setBenefitTypes((data ?? []) as BenefitType[])
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return <BenefitTypesClientPage initialTypes={benefitTypes} />
}
