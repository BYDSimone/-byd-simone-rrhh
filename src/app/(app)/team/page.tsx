import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TeamClientPage from './TeamClientPage'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('id, role, area_id, full_name')
    .eq('id', user.id)
    .single()

  if (!currentProfile) redirect('/login')

  let profilesQuery = supabase
    .from('profiles')
    .select(
      `id, full_name, email, position, role, hire_date, dob, phone, sucursal, area_id, deleted_at,
       areas(id, name, color)`
    )
    .is('deleted_at', null)
    .order('full_name', { ascending: true })

  // Collaborators can only see their own area
  if (currentProfile.role === 'collaborator') {
    profilesQuery = profilesQuery.eq('area_id', currentProfile.area_id)
  }

  const { data: profiles } = await profilesQuery

  return (
    <TeamClientPage
      profiles={profiles ?? []}
      currentUserRole={currentProfile.role}
    />
  )
}
