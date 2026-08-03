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
        <div className="w-8 h-8 rounded-lg
