import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OvertimeClientPage } from './OvertimeClientPage'

export const metadata = { title: 'Horas Extras' }
export const dynamic = 'force-dynamic'

export default async function OvertimePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isLeaderUp = ['leader','manager','hr_admin'].includes(profile.role)
  const isHrAdmin  = profile.role === 'hr_admin'

  // Registros según rol
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
      recordsQuery = recordsQuery.or(`employee_id.eq.${user.id},employee.leader_id.eq.${user.id}`)
    } else {
      recordsQuery = recordsQuery.eq('employee_id', user.id)
    }
  }

  const [
    { data: records },
    { data: myBalance },
    { data: compensations },
    { data: leaders },
  ] = await Promise.all([
    recordsQuery,
    supabase.from('overtime_balance').select('*').eq('employee_id', user.id).single(),
    supabase.from('overtime_compensations')
      .select('*, employee:profiles!overtime_compensations_employee_id_fkey(id,full_name)')
      .eq('employee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('profiles')
      .select('id,full_name')
      .in('role', ['leader','manager','hr_admin'])
      .is('deleted_at', null)
      .order('full_name'),
  ])

  return (
    <OvertimeClientPage
      initialRecords={records ?? []}
      myBalance={myBalance}
      compensations={compensations ?? []}
      leaders={leaders ?? []}
      currentUserId={user.id}
      currentRole={profile.role}
    />
  )
}
