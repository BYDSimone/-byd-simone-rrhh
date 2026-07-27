import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')
  const user = session.user

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .is('read_at', null)

  return (
    <div className="min-h-screen">
      <Sidebar profile={profile as Profile} unreadCount={unreadCount ?? 0} />
      <main
        className="min-h-screen"
        style={{ paddingLeft: 'var(--sidebar-width)' }}
      >
        <div className="md:hidden h-14" />
        {children}
      </main>
    </div>
  )
}
