import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UsersClientPage } from './UsersClientPage'

export const metadata = { title: 'Usuarios' }

export default async function UsersPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hr_admin') redirect('/dashboard')

  // Cargar datos iniciales en el servidor
  const [
    { data: users },
    { data: areas },
    { data: leaders },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, area:areas(id,name,color), leader:profiles!profiles_leader_id_fkey(id,full_name)')
      .is('deleted_at', null)
      .order('full_name'),
    supabase.from('areas').select('*').eq('is_active', true).order('name'),
    supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['leader', 'manager', 'hr_admin'])
      .is('deleted_at', null)
      .order('full_name'),
  ])

  return (
    <UsersClientPage
      initialUsers={users ?? []}
      areas={areas ?? []}
      leaders={leaders ?? []}
      currentUserId={user.id}
    />
  )
}
