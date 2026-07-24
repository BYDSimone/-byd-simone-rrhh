import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { RequestDetailClient } from './RequestDetailClient'

export const dynamic = 'force-dynamic'

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: request } = await supabase
    .from('requests')
    .select(`
      *,
      employee:profiles!requests_employee_id_fkey(
        id, full_name, avatar_url, hire_date, position, sucursal, area_id,
        area:areas(id,name,color)
      ),
      benefit_type:benefit_types(*),
      reviewer:profiles!requests_reviewer_id_fkey(id, full_name, avatar_url),
      medical_certificates(*)
    `)
    .eq('id', params.id)
    .single()

  if (!request) notFound()

  const isOwner    = request.employee_id === user.id
  const isHrAdmin  = profile.role === 'hr_admin'
  const isLeaderUp = ['leader','manager','hr_admin'].includes(profile.role)

  // Solo puede ver: propio o si gestiona al empleado
  if (!isOwner && !isHrAdmin) {
    // Verificar si el líder gestiona al empleado
    const { data: emp } = await supabase
      .from('profiles').select('leader_id').eq('id', request.employee_id).single()
    if (emp?.leader_id !== user.id) redirect('/requests')
  }

  // Log de auditoría para este request
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('table_name', 'requests')
    .eq('record_id', params.id)
    .order('created_at', { ascending: true })

  return (
    <RequestDetailClient
      request={request as any}
      auditLogs={auditLogs ?? []}
      currentUserId={user.id}
      currentRole={profile.role}
    />
  )
}
