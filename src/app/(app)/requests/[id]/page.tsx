'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAppContext } from '@/lib/context/AppContext'
import { createClient } from '@/lib/supabase/client'
import { RequestDetailClient } from './RequestDetailClient'
import { Loader2 } from 'lucide-react'

export default function RequestDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { profile, userId } = useAppContext()
  const router = useRouter()
  const supabase = createClient()

  const [request, setRequest] = useState<any>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!userId || !profile || !id) return
    async function load() {
      const { data: req } = await supabase
        .from('requests')
        .select(`
          *,
          employee:profiles!requests_employee_id_fkey(
            id, full_name, avatar_url, hire_date, position, sucursal, area_id,
            area:areas(id,name,color)
          ),
          benefit_type:benefit_types(*),
          reviewer:profiles!requests_reviewer_id_fkey(id, full_name, avatar_url),
          medical_certificates(*)
        `)
        .eq('id', id)
        .single()

      if (!req) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const isOwner = req.employee_id === userId
      const isHrAdmin = profile.role === 'hr_admin'

      // Solo puede ver: propio o si gestiona al empleado
      if (!isOwner && !isHrAdmin) {
        const { data: emp } = await supabase
          .from('profiles')
          .select('leader_id')
          .eq('id', req.employee_id)
          .single()
        if (emp?.leader_id !== userId) {
          router.push('/requests')
          return
        }
      }

      // Log de auditoría para este request
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('table_name', 'requests')
        .eq('record_id', id)
        .order('created_at', { ascending: true })

      setRequest(req)
      setAuditLogs(logs ?? [])
      setLoading(false)
    }
    load()
  }, [userId, profile, id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        Solicitud no encontrada.
      </div>
    )
  }

  return (
    <RequestDetailClient
      request={request}
      auditLogs={auditLogs}
      currentUserId={userId!}
      currentRole={profile!.role}
    />
  )
}
