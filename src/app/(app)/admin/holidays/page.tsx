import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HolidaysClientPage from './HolidaysClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Holiday {
  id: string
  date: string
  name: string
  is_national: boolean
  year: number
}

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function HolidaysPage() {
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

  const currentYear = new Date().getFullYear()

  const { data: holidays } = await supabase
    .from('holidays')
    .select('id, date, name, is_national, year')
    .in('year', [currentYear, currentYear + 1])
    .order('date', { ascending: true })

  return (
    <HolidaysClientPage
      initialHolidays={(holidays ?? []) as Holiday[]}
      currentYear={currentYear}
    />
  )
}
