import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RequestsClientPage } from './RequestsClientPage'

export const metadata = { title: 'Solicitudes' }
export const dynamic = 'force-dynamic'

export default async function RequestsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role, area_id').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isHrAdmin    = profile.role === 'hr_admin'
  const isLeaderUp   = ['leader','manager','hr_admin'].includes(profile.role)

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
      // líder: propias + las de su equipo directo
      query = query.or(`employee_id.eq.${user.id},employee.leader_id.eq.${user.id}`)
    } else {
      query = query.eq('employee_id', user.id)
    }
  }

  const { data: requests } = await query

  const { data: benefitTypes } = await supabase
    .from('benefit_types').select('id, name, color, code').eq('is_active', true).order('sort_order')

  return (
    <RequestsClientPage
      initialRequests={requests ?? []}
      benefitTypes={benefitTypes ?? []}
      currentUserId={user.id}
      currentRole={profile.role}
    />
  )
}
