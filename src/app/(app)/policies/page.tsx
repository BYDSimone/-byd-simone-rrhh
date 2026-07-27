'use client'

import { useEffect, useState } from 'react'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import PoliciesClientPage from './PoliciesClientPage'

export default function PoliciesPage() {
  const { userId } = useAppContext()
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [acknowledgments, setAcknowledgments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    async function load() {
      setLoading(true)

      const { data: docs, error: docsError } = await supabase
        .from('policy_documents')
        .select('*')
        .eq('is_active', true)
        .not('published_at', 'is', null)
        .order('category', { ascending: true })
        .order('title', { ascending: true })

      if (docsError) console.error('Error fetching policy documents:', docsError)

      const { data: acks, error: ackError } = await supabase
        .from('policy_acknowledgments')
        .select('document_id, acknowledged_at')
        .eq('employee_id', userId)

      if (ackError) console.error('Error fetching acknowledgments:', ackError)

      setDocuments(docs ?? [])
      setAcknowledgments(acks ?? [])
      setLoading(false)
    }
    load()
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return null

  return (
    <PoliciesClientPage
      documents={documents}
      myAcknowledgments={acknowledgments}
      currentUserId={userId!}
    />
  )
}
