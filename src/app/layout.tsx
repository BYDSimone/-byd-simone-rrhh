import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) redirect('/login')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return (
    <div className="min-h-screen">
      <Sidebar profile={profile as Profile} unreadCount={unreadCount ?? 0} />

      {/* Main content — offset by sidebar width */}
      <main
        className="min-h-screen"
        style={{ paddingLeft: 'var(--sidebar-width)' }}
      >
        {/* Mobile top padding (sidebar is drawer on mobile) */}
        <div className="md:hidden h-14" />
        {children}
      </main>
    </div>
  )
}
