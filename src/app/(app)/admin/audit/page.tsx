import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
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

// ─── Server Component ─────────────────────────────────────────────────────────

export default async function AuditPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hr_admin') redirect('/dashboard')

  // Fetch recent audit logs with user info
  const { data: rawLogs } = await supabase
    .from('audit_logs')
    .select('id, created_at, user_id, action, table_name, record_id, old_data, new_data')
    .order('created_at', { ascending: false })
    .limit(200)

  const logs = rawLogs ?? []

  // Get unique user ids to fetch profile info
  const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))] as string[]
  let userMap: Record<string, { full_name: string; email: string }> = {}

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    for (const p of profiles ?? []) {
      userMap[p.id] = { full_name: p.full_name, email: p.email }
    }
  }

  const auditLogs: AuditLog[] = logs.map((l) => ({
    ...l,
    action: l.action as AuditLog['action'],
    old_data: (l.old_data as Record<string, unknown>) ?? null,
    new_data: (l.new_data as Record<string, unknown>) ?? null,
    user_full_name: l.user_id ? (userMap[l.user_id]?.full_name ?? null) : null,
    user_email: l.user_id ? (userMap[l.user_id]?.email ?? null) : null,
  }))

  return <AuditClientPage initialLogs={auditLogs} />
}
