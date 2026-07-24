'use client'

import { useState, useMemo } from 'react'
import { Plus, Search, Filter, Trash2, UserCog, Building2, MapPin, MoreHorizontal, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { UserFormModal } from './UserFormModal'
import type { Profile, Area } from '@/lib/types'
import { ROLE_LABELS, SUCURSAL_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/dates'

interface Props {
  initialUsers:  Profile[]
  areas:         Area[]
  leaders:       Pick<Profile, 'id' | 'full_name'>[]
  currentUserId: string
}

const SUCURSAL_OPTIONS = [
  { value: '',              label: 'Todas las sucursales' },
  { value: 'la_plata',     label: 'La Plata' },
  { value: 'mar_del_plata', label: 'Mar del Plata' },
  { value: 'brandsen',     label: 'Brandsen' },
]

const ROLE_OPTIONS = [
  { value: '',             label: 'Todos los roles' },
  { value: 'collaborator', label: 'Colaborador' },
  { value: 'leader',       label: 'Líder' },
  { value: 'manager',      label: 'Gerente' },
  { value: 'hr_admin',     label: 'RRHH / Admin' },
]

export function UsersClientPage({ initialUsers, areas, leaders, currentUserId }: Props) {
  const supabase = createClient()

  const [users,        setUsers]        = useState<Profile[]>(initialUsers)
  const [search,       setSearch]       = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterSucursal, setFilterSucursal] = useState('')
  const [filterArea,   setFilterArea]   = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [editingUser,  setEditingUser]  = useState<Profile | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  // ── Filtros ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return users.filter(u => {
      const matchSearch = !q
        || u.full_name.toLowerCase().includes(q)
        || u.dni?.toLowerCase().includes(q)
        || u.employee_code?.toLowerCase().includes(q)
        || u.position?.toLowerCase().includes(q)
      const matchRole     = !filterRole     || u.role === filterRole
      const matchSucursal = !filterSucursal || u.sucursal === filterSucursal
      const matchArea     = !filterArea     || u.area_id === filterArea
      return matchSearch && matchRole && matchSucursal && matchArea
    })
  }, [users, search, filterRole, filterSucursal, filterArea])

  // ── Crear / editar usuario ────────────────────────────────
  async function handleSaved(user: Profile) {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === user.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = user
        return next
      }
      return [user, ...prev].sort((a, b) => a.full_name.localeCompare(b.full_name))
    })
    setShowModal(false)
    setEditingUser(null)
  }

  // ── Soft delete ───────────────────────────────────────────
  async function handleDelete() {
    if (!deleteConfirm) return
    if (deleteConfirm.id === currentUserId) {
      toast.error('No podés eliminar tu propio usuario.')
      setDeleteConfirm(null)
      return
    }
    setDeleting(true)
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString(), status: 'inactive' })
      .eq('id', deleteConfirm.id)

    if (error) {
      toast.error('Error al eliminar el usuario.')
    } else {
      setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id))
      toast.success(`${deleteConfirm.full_name} fue eliminado correctamente.`)
    }
    setDeleting(false)
    setDeleteConfirm(null)
  }

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function getSucursalColor(sucursal: string | null) {
    if (!sucursal) return 'bg-slate-100 text-slate-500'
    return {
      la_plata:      'bg-blue-50 text-blue-700',
      mar_del_plata: 'bg-teal-50 text-teal-700',
      brandsen:      'bg-amber-50 text-amber-700',
    }[sucursal] ?? 'bg-slate-100 text-slate-500'
  }

  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-sm text-text-muted mt-1">
            {users.length} colaborador{users.length !== 1 ? 'es' : ''} en el sistema
          </p>
        </div>
        <button
          onClick={() => { setEditingUser(null); setShowModal(true) }}
          className="btn-primary"
        >
          <Plus size={16} />
          Nuevo usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-5">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Buscar por nombre, DNI o legajo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-9"
            />
          </div>

          {/* Role filter */}
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="form-input w-full sm:w-44"
          >
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Sucursal filter */}
          <select
            value={filterSucursal}
            onChange={e => setFilterSucursal(e.target.value)}
            className="form-input w-full sm:w-44"
          >
            {SUCURSAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Area filter */}
          <select
            value={filterArea}
            onChange={e => setFilterArea(e.target.value)}
            className="form-input w-full sm:w-44"
          >
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {filtered.length !== users.length && (
          <p className="text-xs text-text-muted mt-2.5">
            Mostrando {filtered.length} de {users.length} usuarios
            {(search || filterRole || filterSucursal || filterArea) && (
              <button
                onClick={() => { setSearch(''); setFilterRole(''); setFilterSucursal(''); setFilterArea('') }}
                className="ml-2 text-brand-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </p>
        )}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="empty-state card">
          <UserCog size={40} className="text-border-strong" />
          <p className="font-semibold text-text-secondary">No se encontraron usuarios</p>
          <p className="text-sm">Probá con otros filtros o creá un nuevo usuario.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Legajo</th>
                  <th>Cargo</th>
                  <th>Área</th>
                  <th>Sucursal</th>
                  <th>Rol</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="group">

                    {/* Colaborador */}
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-brand-700">{getInitials(user.full_name)}</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-text-primary text-sm leading-tight">{user.full_name}</p>
                          {user.dni && <p className="text-xs text-text-muted">DNI {user.dni}</p>}
                        </div>
                      </div>
                    </td>

                    {/* Legajo */}
                    <td>
                      <span className="font-mono text-xs text-text-muted">
                        {user.employee_code ?? '—'}
                      </span>
                    </td>

                    {/* Cargo */}
                    <td className="text-sm">{user.position ?? <span className="text-text-muted">—</span>}</td>

                    {/* Área */}
                    <td>
                      {(user as any).area ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: (user as any).area.color }}
                          />
                          <span className="text-sm">{(user as any).area.name}</span>
                        </div>
                      ) : <span className="text-text-muted text-sm">—</span>}
                    </td>

                    {/* Sucursal */}
                    <td>
                      {user.sucursal ? (
                        <span className={cn('badge', getSucursalColor(user.sucursal))}>
                          <MapPin size={10} />
                          {SUCURSAL_LABELS[user.sucursal]}
                        </span>
                      ) : <span className="text-text-muted text-sm">—</span>}
                    </td>

                    {/* Rol */}
                    <td>
                      <span className={`badge-${user.role}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>

                    {/* Ingreso */}
                    <td className="text-sm text-text-muted whitespace-nowrap">
                      {formatDate(user.hire_date)}
                    </td>

                    {/* Estado */}
                    <td>
                      <span className={cn('badge', {
                        'badge-approved':   user.status === 'active',
                        'badge-cancelled':  user.status === 'inactive',
                        'badge-needs_info': user.status === 'on_leave',
                      })}>
                        {{ active: 'Activo', inactive: 'Inactivo', on_leave: 'De licencia' }[user.status]}
                      </span>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingUser(user); setShowModal(true) }}
                          className="p-1.5 rounded text-text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Editar"
                        >
                          <UserCog size={15} />
                        </button>
                        {user.id !== currentUserId && (
                          <button
                            onClick={() => setDeleteConfirm(user)}
                            className="p-1.5 rounded text-text-muted hover:text-status-rejected hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal crear / editar */}
      {showModal && (
        <UserFormModal
          user={editingUser}
          areas={areas}
          leaders={leaders}
          onSaved={handleSaved}
          onClose={() => { setShowModal(false); setEditingUser(null) }}
        />
      )}

      {/* Modal confirmar eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
          <div className="card p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-status-rejected" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Eliminar usuario</h3>
                <p className="text-sm text-text-muted">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-5">
              ¿Confirmas que querés eliminar a <strong className="text-text-primary">{deleteConfirm.full_name}</strong>?
              El usuario no podrá acceder a la plataforma. Su historial se conserva.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn-danger"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
