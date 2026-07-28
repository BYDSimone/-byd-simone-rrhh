'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Area, UserRole, Sucursal } from '@/lib/types'

const baseSchema = z.object({
  full_name:     z.string().min(2, 'Ingresá el nombre completo'),
  employee_code: z.string().optional(),
  dni:           z.string().optional(),
  birth_date:    z.string().optional(),
  hire_date:     z.string().min(1, 'Ingresá la fecha de ingreso'),
  position:      z.string().optional(),
  area_id:       z.string().min(1, 'Seleccioná un área'),
  leader_id:     z.string().optional(),
  role:          z.enum(['collaborator', 'leader', 'manager', 'hr_admin']),
  sucursal:      z.enum(['la_plata', 'mar_del_plata', 'brandsen', 'todas']),
  phone:         z.string().optional(),
  status:        z.enum(['active', 'inactive', 'on_leave']),
  notes:         z.string().optional(),
})

const createSchema = baseSchema.extend({
  email:    z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

const editSchema = baseSchema

type CreateForm = z.infer<typeof createSchema>
type EditForm   = z.infer<typeof editSchema>
type FormData   = CreateForm | EditForm

interface Props {
  user?:    Profile | null
  areas:    Area[]
  leaders:  Pick<Profile, 'id' | 'full_name'>[]
  onSaved:  (user: Profile) => void
  onClose:  () => void
}

const isEditing = (user: Profile | null | undefined): user is Profile => !!user

export function UserFormModal({ user, areas, leaders, onSaved, onClose }: Props) {
  const supabase = createClient()
  const editing  = isEditing(user)
  const [showPass, setShowPass] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  const handleChangePassword = async () => {
    if (!user || newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setChangingPass(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password: newPassword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message ?? 'Error al cambiar contraseña')
      }
      toast.success('Contraseña actualizada correctamente')
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.message ?? 'Error al cambiar contraseña')
    } finally {
      setChangingPass(false)
    }
  }

  const schema = editing ? editSchema : createSchema

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema as any),
    defaultValues: editing ? {
      full_name:     user.full_name,
      employee_code: user.employee_code ?? '',
      dni:           user.dni ?? '',
      birth_date:    user.birth_date ?? '',
      hire_date:     user.hire_date,
      position:      user.position ?? '',
      area_id:       user.area_id ?? '',
      leader_id:     user.leader_id ?? '',
      role:          user.role,
      sucursal:      user.sucursal ?? 'la_plata',
      phone:         user.phone ?? '',
      status:        user.status,
      notes:         user.notes ?? '',
    } : {
      hire_date: new Date().toISOString().split('T')[0],
      role:      'collaborator',
      sucursal:  'la_plata',
      status:    'active',
    },
  })

  async function onSubmit(data: FormData) {
    try {
      if (editing) {
        const { data: updated, error } = await supabase
          .from('profiles')
          .update({
            full_name:     data.full_name,
            employee_code: data.employee_code || null,
            dni:           data.dni || null,
            birth_date:    data.birth_date || null,
            hire_date:     data.hire_date,
            position:      data.position || null,
            area_id:       data.area_id || null,
            leader_id:     (data as EditForm).leader_id || null,
            role:          data.role,
            sucursal:      data.sucursal,
            phone:         data.phone || null,
            status:        data.status,
            notes:         data.notes || null,
          })
          .eq('id', user.id)
          .select('*, area:areas!profiles_area_id_fkey(id,name,color), leader:profiles!profiles_leader_id_fkey(id,full_name)')
          .single()

        if (error) throw error
        toast.success('Usuario actualizado correctamente.')
        onSaved(updated as Profile)

      } else {
        const createData = data as CreateForm

        const res = await fetch('/api/admin/users', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:    createData.email,
            password: createData.password,
            profileData: {
              full_name:     createData.full_name,
              employee_code: createData.employee_code || null,
              dni:           createData.dni || null,
              birth_date:    createData.birth_date || null,
              hire_date:
