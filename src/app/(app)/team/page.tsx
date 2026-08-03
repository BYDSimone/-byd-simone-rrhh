'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import TeamClientPage from './TeamClientPage'

export default function TeamPage() {
  const { profile, userId } = useAppContext()
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !profile) return

    const fetchData = async () => {
      const supabase = createClient()

      let profilesQuery = supabase
        .from('profiles')
        .select(
          `id, full_name, position, role, hire_date, birth_date, phone, sucursal, area_id, status,
           area:areas!profiles_area_id_fkey(id, name, color)`
        )
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('full_name', { ascending: true })

      if (profile.role === 'collaborator') {
        profilesQuery = profilesQuery.eq('area_id', profile.area_id)
      }

      const { data: profilesData } = await profilesQuery

      setProfiles(profilesData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [userId, profile])

  if (loading || !profile || !userId) return null

  return (
    <TeamClientPage
      profiles={profiles}
      currentUserRole={profile.role}
    />
  )
}
