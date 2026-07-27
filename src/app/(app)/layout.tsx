'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Profile } from '@/lib/types'
import { AppContext } from '@/lib/context/AppContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!data) { router.replace('/login'); return }

      setUserId(session.user.id)
      setProfile(data as Profile)
      setLoading(false)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.replace('/login')
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!profile || !userId) return null

  return (
    <AppContext.Provider value={{ profile, userId }}>
      <div className="min-h-screen">
        <Sidebar profile={profile} unreadCount={0} />
        <main className="min-h-screen" style={{ paddingLeft: 'var(--sidebar-width)' }}>
          <div className="md:hidden h-14" />
          {children}
        </main>
      </div>
    </AppContext.Provider>
  )
}
