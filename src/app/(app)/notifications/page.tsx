'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import NotificationsClientPage from './NotificationsClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  link: string | null
  created_at: string
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { profile, userId } = useAppContext()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !profile) return

    const fetchData = async () => {
      const supabase = createClient()

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)

      setNotifications((data ?? []) as Notification[])
      setLoading(false)
    }

    fetchData()
  }, [userId, profile])

  if (loading || !profile || !userId) return null

  return <NotificationsClientPage initialNotifications={notifications} />
}
