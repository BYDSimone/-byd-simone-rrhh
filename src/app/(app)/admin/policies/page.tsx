import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminPoliciesClientPage from './AdminPoliciesClientPage'

export const dynamic = 'force-dynamic'

export default async function AdminPoliciesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check hr_admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hr_admin') {
    redirect('/dashboard')
  }

  // Fetch all policy documents ordered by category then title
  const { data: documents, error: docsError } = await supabase
    .from('policy_documents')
    .select('*')
    .order('category', { ascending: true })
    .order('title', { ascending: true })

  if (docsError) {
    console.error('Error fetching policy documents:', docsError)
  }

  // Fetch acknowledgment counts for each document
  const { data: ackCounts } = await supabase
    .from('policy_acknowledgments')
    .select('document_id')

  const ackCountMap: Record<string, number> = {}
  if (ackCounts) {
    for (const ack of ackCounts) {
      ackCountMap[ack.document_id] = (ackCountMap[ack.document_id] || 0) + 1
    }
  }

  const documentsWithAcks = (documents ?? []).map((doc) => ({
    ...doc,
    ack_count: ackCountMap[doc.id] ?? 0,
  }))

  // Fetch total active employee count (non-deleted, active status)
  const { count: totalEmployees } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
    .is('deleted_at', null)

  return (
    <AdminPoliciesClientPage
      documents={documentsWithAcks}
      totalEmployees={totalEmployees ?? 0}
    />
  )
}
