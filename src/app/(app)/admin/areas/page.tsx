'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
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

// ─── Client Component ─────────────────────────────────────────────────────────

export default function AreasPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      const { data: areasData } = await supabase
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

      const areasWithCount: Area[] = (areasData ?? []).map((a) => ({
        ...a,
        description: a.description ?? null,
        color: a.color ?? null,
        member_count: countMap[a.id] ?? 0,
      }))

      setAreas(areasWithCount)
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return <AreasClientPage initialAreas={areas} />
}
