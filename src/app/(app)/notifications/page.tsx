import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificationsClientPage from './NotificationsClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string | null
  is_read: boolean
  link: string | null
  created_at: string
}

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  return <NotificationsClientPage initialNotifications={(notifications ?? []) as Notification[]} />
}
