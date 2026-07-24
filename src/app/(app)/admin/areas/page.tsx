import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AreasClientPage from './AreasClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Area {
  id: string
  name: string
  description: string | null
  color: string | null
  member_count: number
  created_at: string
}

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function AreasPage() {
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

  const { data: areas } = await supabase
    .from('areas')
    .select('id, name, description, color, created_at')
    .order('name')

  // Get member count per area
  const { data: counts } = await supabase
    .from('profiles')
    .select('area_id')
    .eq('is_active', true)
    .not('area_id', 'is', null)

  const countMap: Record<string, number> = {}
  for (const row of counts ?? []) {
    if (row.area_id) countMap[row.area_id] = (countMap[row.area_id] ?? 0) + 1
  }

  const areasWithCount: Area[] = (areas ?? []).map((a) => ({
    ...a,
    description: a.description ?? null,
    color: a.color ?? null,
    member_count: countMap[a.id] ?? 0,
  }))

  return <AreasClientPage initialAreas={areasWithCount} />
}
