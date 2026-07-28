import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
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

  const { email, password, profileData } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ message: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  const userId = data.user.id

  if (profileData) {
    const { data: newProfile, error: profileError } = await adminClient
      .from('profiles')
      .upsert({ id: userId, ...profileData })
      .select('*')
      .single()

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json({ message: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ userId, profile: newProfile })
  }

  return NextResponse.json({ userId })
}

export async function PATCH(request: NextRequest) {
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

  const { userId, password } = await request.json()
  if (!userId || !password) {
    return NextResponse.json({ message: 'userId y password requeridos' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.updateUserById(userId, { password })

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}

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
