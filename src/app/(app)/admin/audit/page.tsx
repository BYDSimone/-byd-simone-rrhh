'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import AuditClientPage from './AuditClientPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string
  created_at: string
  user_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  user_full_name: string | null
  user_email: string | null
}

// ─── Client Component ─────────────────────────────────────────────────────────

export default function AuditPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      // Fetch recent audit logs
      const { data: rawLogs } = await supabase
        .from('audit_logs')
        .select('id, created_at, user_id, action, table_name, record_id, old_data, new_data')
        .order('created_at', { ascending: false })
        .limit(200)

      const logs = rawLogs ?? []

      // Get unique user ids to fetch profile info
      const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
      const userMap: Record<string, { full_name: string; email: string }> = {}

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds)

        for (const p of profiles ?? []) {
          userMap[p.id] = { full_name: p.full_name, email: p.email }
        }
      }

      const enriched: AuditLog[] = logs.map((l) => ({
        ...l,
        action: l.action as AuditLog['action'],
        old_data: (l.old_data as Record<string, unknown>) ?? null,
        new_data: (l.new_data as Record<string, unknown>) ?? null,
        user_full_name: l.user_id ? (userMap[l.user_id]?.full_name ?? null) : null,
        user_email: l.user_id ? (userMap[l.user_id]?.email ?? null) : null,
      }))

      setAuditLogs(enriched)
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return <AuditClientPage initialLogs={auditLogs} />
}
