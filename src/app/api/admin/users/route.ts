import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

// POST /api/admin/users — Crear usuario en Supabase Auth (requiere service_role)
export async function POST(request: NextRequest) {
  // Verificar que el solicitante es hr_admin
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hr_admin') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email y contraseña requeridos' }, { status: 400 })
  }

  // Crear usuario con service_role (bypasea confirmación de email)
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,  // Auto-confirmar email
  })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  return NextResponse.json({ userId: data.user.id })
}

// DELETE /api/admin/users — Eliminar usuario de Auth (soft delete en profile lo hace el client)
export async function DELETE(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'hr_admin') {
    return NextResponse.json({ message: 'No autorizado' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) return NextResponse.json({ message: 'userId requerido' }, { status: 400 })

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(userId)

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
