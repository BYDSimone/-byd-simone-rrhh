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

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
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
          .select('*, area:areas(id,name,color), leader:profiles!profiles_leader_id_fkey(id,full_name)')
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
              hire_date:     createData.hire_date,
              position:      createData.position || null,
              area_id:       createData.area_id || null,
              leader_id:     createData.leader_id || null,
              role:          createData.role,
              sucursal:      createData.sucursal,
              phone:         createData.phone || null,
              status:        'active',
              notes:         createData.notes || null,
            },
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.message ?? 'Error al crear el usuario')
        }

        const { profile: newProfile } = await res.json()
        toast.success(`${createData.full_name} fue creado correctamente.`)
        onSaved(newProfile as Profile)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Ocurrió un error. Intentá de nuevo.')
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">

        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface z-10">
          <div>
            <h2 className="text-base font-semibold">
              {editing ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              {editing ? `Editando: ${user.full_name}` : 'Completá los datos del nuevo colaborador'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          const msgs = Object.entries(errs).map(([k, v]: any) => `${k}: ${v?.message}`).join(' | ')
          toast.error(`Errores de validación: ${msgs}`)
        })} className="p-6 space-y-6" noValidate>

          {!editing && (
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                Datos de acceso
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" placeholder="nombre@bydsimone.com.ar" {...register('email' as any)} />
                  {(errors as any).email && <p className="form-error">{(errors as any).email.message}</p>}
                </div>
                <div>
                  <label className="form-label">Contraseña *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="form-input pr-10"
                      placeholder="Mínimo 8 caracteres"
                      {...register('password' as any)}
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" tabIndex={-1}>
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {(errors as any).password && <p className="form-error">{(errors as any).password.message}</p>}
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Datos personales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="form-label">Nombre completo *</label>
                <input type="text" className="form-input" placeholder="Ej: María González" {...register('full_name')} />
                {errors.full_name && <p className="form-error">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="form-label">DNI</label>
                <input type="text" className="form-input" placeholder="30111222" {...register('dni')} />
              </div>
              <div>
                <label className="form-label">Teléfono</label>
                <input type="text" className="form-input" placeholder="+54 221 555 0000" {...register('phone')} />
              </div>
              <div>
                <label className="form-label">Fecha de nacimiento</label>
                <input type="date" className="form-input" {...register('birth_date')} />
              </div>
              <div>
                <label className="form-label">Fecha de ingreso *</label>
                <input type="date" className="form-input" {...register('hire_date')} />
                {errors.hire_date && <p className="form-error">{errors.hire_date.message}</p>}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              Datos laborales
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Legajo</label>
                <input type="text" className="form-input" placeholder="BYD-0001" {...register('employee_code')} />
              </div>
              <div>
                <label className="form-label">Cargo / Puesto</label>
                <input type="text" className="form-input" placeholder="Ej: Vendedor Sr." {...register('position')} />
              </div>
              <div>
                <label className="form-label">Área *</label>
                <select className="form-input" {...register('area_id')}>
                  <option value="">Seleccioná un área</option>
                  {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {errors.area_id && <p className="form-error">{errors.area_id.message}</p>}
              </div>
              <div>
                <label className="form-label">Líder directo</label>
                <select className="form-input" {...register('leader_id')}>
                  <option value="">Sin líder asignado</option>
                  {leaders.map(l => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Rol en el sistema *</label>
                <select className="form-input" {...register('role')}>
                  <option value="collaborator">Colaborador</option>
                  <option value="leader">Líder</option>
                  <option value="manager">Gerente</option>
                  <option value="hr_admin">RRHH / Admin</option>
                </select>
              </div>
              <div>
                <label className="form-label">Sucursal *</label>
                <select className="form-input" {...register('sucursal')}>
                  <option value="la_plata">La Plata</option>
                  <option value="mar_del_plata">Mar del Plata</option>
                  <option value="brandsen">Brandsen</option>
                  <option value="todas">Todas las sucursales</option>
                </select>
                {errors.sucursal && <p className="form-error">{errors.sucursal.message}</p>}
              </div>
              {editing && (
                <div>
                  <label className="form-label">Estado</label>
                  <select className="form-input" {...register('status')}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                    <option value="on_leave">De licencia</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="form-label">Notas internas (solo RRHH)</label>
            <textarea
              rows={3}
              className="form-input resize-none"
              placeholder="Observaciones internas sobre el colaborador..."
              {...register('notes')}
            />
          </div>

          {editing && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                Cambiar contraseña
              </h3>
              <p className="text-xs text-amber-700">
                Usá esto si el colaborador olvidó su contraseña.
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 8 caracteres)"
                    className="form-input pr-10 w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                    tabIndex={-1}
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={changingPass || newPassword.length < 8}
                  className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {changingPass ? <Loader2 size={15} className="animate-spin" /> : 'Actualizar'}
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 size={15} className="animate-spin" /> {editing ? 'Guardando...' : 'Creando...'}</>
                : editing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
