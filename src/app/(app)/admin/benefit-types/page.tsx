import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function BenefitTypesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr_admin') redirect('/dashboard')

  const { data: benefitTypes } = await supabase
    .from('benefit_types')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  return <BenefitTypesClientPage initialTypes={(benefitTypes ?? []) as BenefitType[]} />
}
