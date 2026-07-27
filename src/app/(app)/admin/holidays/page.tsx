'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import HolidaysClientPage from './HolidaysClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Holiday {
  id: string
  date: string
  name: string
  is_national: boolean
  year: number
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      const { data } = await supabase
        .from('holidays')
        .select('id, date, name, is_national, year')
        .in('year', [currentYear, currentYear + 1])
        .order('date', { ascending: true })

      setHolidays((data ?? []) as Holiday[])
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <HolidaysClientPage
      initialHolidays={holidays}
      currentYear={currentYear}
    />
  )
}
