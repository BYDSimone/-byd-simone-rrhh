'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { UsersClientPage } from './UsersClientPage'

export default function UsersPage() {
  const { profile, userId } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [users, setUsers] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      const [
        { data: usersData },
        { data: areasData },
        { data: leadersData },
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, area:areas!profiles_area_id_fkey(id,name,color)')
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

      setUsers(usersData ?? [])
      setAreas(areasData ?? [])
      setLeaders(leadersData ?? [])
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <UsersClientPage
      initialUsers={users}
      areas={areas}
      leaders={leaders}
      currentUserId={userId!}
    />
  )
}
