'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import AdminPoliciesClientPage from './AdminPoliciesClientPage'

export default function AdminPoliciesPage() {
  const { profile } = useAppContext()
  const router = useRouter()
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [totalEmployees, setTotalEmployees] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'hr_admin') {
      router.push('/dashboard')
      return
    }
    async function load() {
      // Fetch all policy documents ordered by category then title
      const { data: docs, error: docsError } = await supabase
        .from('policy_documents')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true })

      if (docsError) console.error('Error fetching policy documents:', docsError)

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

      const documentsWithAcks = (docs ?? []).map((doc) => ({
        ...doc,
        ack_count: ackCountMap[doc.id] ?? 0,
      }))

      // Fetch total active employee count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .is('deleted_at', null)

      setDocuments(documentsWithAcks)
      setTotalEmployees(count ?? 0)
      setLoading(false)
    }
    load()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <AdminPoliciesClientPage
      documents={documents}
      totalEmployees={totalEmployees}
    />
  )
}
