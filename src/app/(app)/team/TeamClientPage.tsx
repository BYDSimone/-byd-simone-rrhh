'use client'

import { useState, useMemo } from 'react'
import { X, Mail, Phone, MapPin, Briefcase, CalendarDays, User, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate, getAntiguedad } from '@/lib/utils/dates'
import { SUCURSAL_LABELS } from '@/lib/types'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Area {
  id: string
  name: string
  color?: string | null
}

interface Profile {
  id: string
  full_name: string
  email: string
  position?: string | null
  role: string
  hire_date?: string | null
  dob?: string | null
  phone?: string | null
  sucursal?: string | null
  area_id?: string | null
  deleted_at?: string | null
  areas?: Area | null
}

interface Props {
  profiles: Profile[]
  currentUserRole: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  collaborator: 'Colaborador',
  leader:       'Líder',
  manager:      'Gerente',
  hr_admin:     'RRHH Admin',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function areaColorClass(color?: string | null): string {
  return color ?? '#6366f1'
}

// ─── Employee Card ───────────────────────────────────────────────────────────

function EmployeeCard({
  profile,
  onClick,
}: {
  profile: Profile
  onClick: () => void
}) {
  const initials = getInitials(profile.full_name)
  const dotColor = areaColorClass(profile.areas?.color)
  const sucursalLabel =
    (SUCURSAL_LABELS as Record<string, string>)[profile.sucursal ?? ''] ?? profile.sucursal ?? 'Sin sucursal'

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        >
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 truncate">{profile.full_name}</span>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </div>

          {profile.position && (
            <p className="text-sm text-gray-500 truncate mb-2">{profile.position}</p>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {profile.areas && (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                {profile.areas.name}
              </span>
            )}
            {profile.sucursal && (
              <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                {sucursalLabel}
              </span>
            )}
          </div>

          {profile.hire_date && (
            <p className="text-xs text-gray-400 mt-2">
              Ingreso: {formatDate(profile.hire_date)}
            </p>
          )}
        </div>
      </div>

      {profile.email && (
        <a
          href={`mailto:${profile.email}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 truncate"
        >
          <Mail size={11} />
          {profile.email}
        </a>
      )}
    </button>
  )
}

// ─── Slide-over Detail Panel ─────────────────────────────────────────────────

function ProfileDrawer({
  profile,
  onClose,
}: {
  profile: Profile
  onClose: () => void
}) {
  const initials = getInitials(profile.full_name)
  const dotColor = areaColorClass(profile.areas?.color)
  const sucursalLabel =
    (SUCURSAL_LABELS as Record<string, string>)[profile.sucursal ?? ''] ?? profile.sucursal ?? 'Sin sucursal'
  const antiguedad = profile.hire_date ? getAntiguedad(profile.hire_date) : null

  const rows = [
    { label: 'Email',      value: profile.email,                         icon: <Mail size={14} />,         type: 'email' },
    { label: 'Teléfono',   value: profile.phone,                         icon: <Phone size={14} />,        type: 'phone' },
    { label: 'Posición',   value: profile.position,                      icon: <Briefcase size={14} />,    type: 'text' },
    { label: 'Área',       value: profile.areas?.name,                   icon: <MapPin size={14} />,       type: 'text' },
    { label: 'Sucursal',   value: sucursalLabel,                         icon: <MapPin size={14} />,       type: 'text' },
    { label: 'Ingreso',    value: profile.hire_date ? formatDate(profile.hire_date) : null, icon: <CalendarDays size={14} />, type: 'text' },
    { label: 'Antigüedad', value: antiguedad,                            icon: <CalendarDays size={14} />, type: 'text' },
    { label: 'Cumpleaños', value: profile.dob ? formatDate(profile.dob) : null, icon: <CalendarDays size={14} />, type: 'text' },
    { label: 'Rol',        value: ROLE_LABELS[profile.role] ?? profile.role, icon: <User size={14} />,    type: 'text' },
  ] as const

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div
          className="p-6 flex items-start gap-4"
          style={{ borderBottom: `3px solid ${dotColor}` }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: dotColor }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{profile.full_name}</h2>
            {profile.position && (
              <p className="text-sm text-gray-500 mt-0.5">{profile.position}</p>
            )}
            <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full mt-2 inline-block">
              {sucursalLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-1">
          {rows.map(({ label, value, icon, type }) => {
            if (!value) return null
            return (
              <div key={label} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
                <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide font-medium">{label}</div>
                  {type === 'email' ? (
                    <a href={`mailto:${value}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {value}
                    </a>
                  ) : type === 'phone' ? (
                    <a href={`tel:${value}`} className="text-sm font-medium text-blue-600 hover:underline">
                      {value}
                    </a>
                  ) : (
                    <div className="text-sm font-medium text-gray-800">{value}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {profile.email && (
          <div className="p-4 border-t border-gray-100">
            <a
              href={`mailto:${profile.email}`}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              <Mail size={15} />
              Enviar email
            </a>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamClientPage({ profiles }: Props) {
  const [search, setSearch] = useState('')
  const [filterSucursal, setFilterSucursal] = useState('')
  const [filterArea, setFilterArea] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  const sucursales = useMemo(
    () => [...new Set(profiles.map((p) => p.sucursal).filter(Boolean))] as string[],
    [profiles]
  )

  const areas = useMemo(() => {
    const map: Record<string, string> = {}
    for (const p of profiles) {
      if (p.area_id && p.areas?.name) map[p.area_id] = p.areas.name
    }
    return Object.entries(map)
  }, [profiles])

  const roles = useMemo(
    () => [...new Set(profiles.map((p) => p.role).filter(Boolean))] as string[],
    [profiles]
  )

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        p.full_name.toLowerCase().includes(q) ||
        (p.email?.toLowerCase() ?? '').includes(q) ||
        (p.position?.toLowerCase() ?? '').includes(q)
      const matchSucursal = !filterSucursal || p.sucursal === filterSucursal
      const matchArea = !filterArea || p.area_id === filterArea
      const matchRole = !filterRole || p.role === filterRole
      return matchSearch && matchSucursal && matchArea && matchRole
    })
  }, [profiles, search, filterSucursal, filterArea, filterRole])

  const selectClass =
    'text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'

  const hasFilters = search || filterSucursal || filterArea || filterRole

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Directorio del Equipo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {profiles.length} {profiles.length === 1 ? 'colaborador activo' : 'colaboradores activos'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Buscar por nombre, email o posición..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2 bg-white text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterSucursal} onChange={(e) => setFilterSucursal(e.target.value)} className={selectClass}>
            <option value="">Todas las sucursales</option>
            {sucursales.map((s) => (
              <option key={s} value={s}>
                {(SUCURSAL_LABELS as Record<string, string>)[s] ?? s}
              </option>
            ))}
          </select>
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className={selectClass}>
            <option value="">Todas las áreas</option>
            {areas.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={selectClass}>
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setSearch(''); setFilterSucursal(''); setFilterArea(''); setFilterRole('') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Card grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User size={28} className="text-gray-300" />
            </div>
            <h3 className="text-base font-semibold text-gray-500">Sin resultados</h3>
            <p className="text-sm text-gray-400 mt-1">
              Intentá con otra búsqueda o filtros diferentes
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((profile) => (
                <EmployeeCard
                  key={profile.id}
                  profile={profile}
                  onClick={() => setSelectedProfile(profile)}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-6">
              Mostrando {filtered.length} de {profiles.length} colaboradores
            </p>
          </>
        )}
      </div>

      {selectedProfile && (
        <ProfileDrawer
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  )
}
