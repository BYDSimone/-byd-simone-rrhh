'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard, FileText, Clock, Calendar, Users,
  BarChart2, Bell, Search, Settings, LogOut,
  ChevronRight, Building2, ShieldCheck, BookOpen,
  Menu, X, Wallet
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'
import { ROLE_LABELS, SUCURSAL_LABELS } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavItem {
  label:    string
  href:     string
  icon:     React.ElementType
  exact?:   boolean
  roles?:   string[]
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '/dashboard',      icon: LayoutDashboard, exact: true },
  { label: 'Solicitudes',    href: '/requests',        icon: FileText },
  { label: 'Horas Extras',   href: '/overtime',        icon: Clock },
  { label: 'Calendario',     href: '/calendar',        icon: Calendar },
  { label: 'Mi Equipo',      href: '/team',            icon: Users,          roles: ['leader', 'manager', 'hr_admin'] },
  { label: 'Reportes',       href: '/reports',         icon: BarChart2,      roles: ['leader', 'manager', 'hr_admin'] },
  { label: 'Notificaciones', href: '/notifications',   icon: Bell },
  { label: 'Políticas',      href: '/policies',         icon: BookOpen },
]

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Usuarios',       href: '/admin/users',         icon: Users },
  { label: 'Áreas',          href: '/admin/areas',          icon: Building2 },
  { label: 'Licencias',      href: '/admin/benefit-types',  icon: ShieldCheck },
  { label: 'Balances',       href: '/admin/balances',        icon: Wallet },
  { label: 'Feriados',       href: '/admin/holidays',       icon: Calendar },
  { label: 'Configuración',  href: '/admin/settings',       icon: Settings },
  { label: 'Políticas',      href: '/admin/policies',       icon: BookOpen },
  { label: 'Auditoría',      href: '/admin/audit',          icon: FileText },
]

interface SidebarProps {
  profile: Profile
  unreadCount?: number
}

export function Sidebar({ profile, unreadCount = 0 }: SidebarProps) {
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isHrAdmin = profile.role === 'hr_admin'

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-4.5 h-4.5">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.4L20 8.5l-8 4.1-8-4.1L12 4.4zM3.5 9.8l7.5 3.9v7.5L3.5 17V9.8zm9.5 11.4v-7.5l7.5-3.9V17l-7.5 4.2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary leading-tight tracking-tight">BYD Simone</p>
          <p className="text-xs text-text-muted">RRHH</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-3">
        <Link
          href="/search"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-text-muted bg-surface-subtle border border-border hover:border-border-strong transition-colors"
        >
          <Search size={14} />
          <span>Buscar...</span>
          <kbd className="ml-auto text-xs bg-surface-raised px-1.5 py-0.5 rounded border border-border hidden sm:inline">⌘K</kbd>
        </Link>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">

        {NAV_ITEMS.filter(item =>
          !item.roles || item.roles.includes(profile.role)
        ).map(item => {
          const active = isActive(item)
          const Icon   = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100',
                active
                  ? 'bg-brand-50 text-brand-700 border border-brand-100'
                  : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
              )}
            >
              <Icon size={16} className={active ? 'text-brand-600' : 'text-text-muted group-hover:text-text-secondary'} />
              <span className="flex-1">{item.label}</span>
              {item.href === '/notifications' && unreadCount > 0 && (
                <span className="bg-brand-600 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}

        {/* Admin nav */}
        {isHrAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Administración</p>
            </div>
            {ADMIN_ITEMS.map(item => {
              const active = isActive(item)
              const Icon   = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100',
                    active
                      ? 'bg-brand-50 text-brand-700 border border-brand-100'
                      : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                  )}
                >
                  <Icon size={16} className={active ? 'text-brand-600' : 'text-text-muted group-hover:text-text-secondary'} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="px-3 py-3 border-t border-border">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 hover:bg-surface-raised transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-brand-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-brand-700">
                {profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-primary truncate leading-tight">{profile.full_name}</p>
            <p className="text-xs text-text-muted truncate">
              {ROLE_LABELS[profile.role]}
              {profile.sucursal ? ` · ${SUCURSAL_LABELS[profile.sucursal]}` : ''}
            </p>
          </div>
          <ChevronRight size={14} className="text-text-muted flex-shrink-0 group-hover:text-text-secondary" />
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 mt-1 text-sm text-text-muted hover:text-status-rejected hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-surface border-r border-border z-30"
        style={{ width: 'var(--sidebar-width)' }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile: hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-surface border border-border shadow-card"
      >
        <Menu size={18} className="text-text-secondary" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-40 animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed left-0 top-0 bottom-0 bg-surface border-r border-border z-50 animate-slide-up"
            style={{ width: 'min(var(--sidebar-width), 85vw)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-raised"
            >
              <X size={16} />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  )
}
