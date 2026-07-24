import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import PoliciesClientPage from './PoliciesClientPage'

export const metadata = {
  title: 'Políticas y Códigos Internos | BYD Simone',
}

export default async function PoliciesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: documents, error: docsError } = await supabase
    .from('policy_documents')
    .select('*')
    .eq('is_active', true)
    .not('published_at', 'is', null)
    .order('category', { ascending: true })
    .order('title', { ascending: true })

  if (docsError) {
    console.error('Error fetching policy documents:', docsError)
  }

  const { data: acknowledgments, error: ackError } = await supabase
    .from('policy_acknowledgments')
    .select('document_id, acknowledged_at')
    .eq('employee_id', user.id)

  if (ackError) {
    console.error('Error fetching acknowledgments:', ackError)
  }

  return (
    <PoliciesClientPage
      documents={documents ?? []}
      myAcknowledgments={acknowledgments ?? []}
      currentUserId={user.id}
    />
  )
}
