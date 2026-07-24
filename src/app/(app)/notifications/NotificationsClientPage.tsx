'use client'

import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { formatRelative } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'
import type { Notification } from './page'
import {
  Bell,
  CheckCheck,
  FileText,
  Clock,
  AlertCircle,
  Info,
  Gift,
  CalendarCheck,
  Megaphone,
  Inbox,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNotificationIcon(type: string) {
  const map: Record<string, React.ElementType> = {
    request: FileText,
    request_approved: CalendarCheck,
    request_rejected: AlertCircle,
    overtime: Clock,
    announcement: Megaphone,
    benefit: Gift,
    reminder: Bell,
    info: Info,
  }
  return map[type] ?? Info
}

function getIconColor(type: string): string {
  const map: Record<string, string> = {
    request_approved: 'text-green-500 bg-green-50',
    request_rejected: 'text-red-500 bg-red-50',
    overtime: 'text-purple-500 bg-purple-50',
    announcement: 'text-blue-500 bg-blue-50',
    benefit: 'text-amber-500 bg-amber-50',
    reminder: 'text-orange-500 bg-orange-50',
  }
  return map[type] ?? 'text-gray-500 bg-gray-100'
}

function groupNotifications(notifications: Notification[]) {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfWeek = new Date(startOfToday)
  startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay())

  const today: Notification[] = []
  const thisWeek: Notification[] = []
  const older: Notification[] = []

  for (const n of notifications) {
    const d = new Date(n.created_at)
    if (d >= startOfToday) {
      today.push(n)
    } else if (d >= startOfWeek) {
      thisWeek.push(n)
    } else {
      older.push(n)
    }
  }

  return { today, thisWeek, older }
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification
  onRead: (id: string) => void
}) {
  const router = useRouter()
  const Icon = getNotificationIcon(notification.type)
  const colorClass = getIconColor(notification.type)

  const handleClick = () => {
    if (!notification.is_read) onRead(notification.id)
    if (notification.link) router.push(notification.link)
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'w-full rounded-xl px-4 py-3 text-left transition-colors',
        notification.is_read
          ? 'bg-white hover:bg-gray-50'
          : 'bg-blue-50/60 hover:bg-blue-50',
        notification.link ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('text-sm', notification.is_read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900')}>
              {notification.title}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-gray-400">{formatRelative(notification.created_at)}</span>
              {!notification.is_read && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
          {notification.message && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{notification.message}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Group Section ────────────────────────────────────────────────────────────

function NotificationGroup({
  label,
  items,
  onRead,
}: {
  label: string
  items: Notification[]
  onRead: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <section className="space-y-1">
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</h3>
      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {items.map((n) => (
          <NotificationItem key={n.id} notification={n} onRead={onRead} />
        ))}
      </div>
    </section>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function NotificationsClientPage({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const supabase = createClient()
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = useMemo(() => notifications.filter((n) => !n.is_read).length, [notifications])
  const grouped = useMemo(() => groupNotifications(notifications), [notifications])

  const markOneRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    )
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  }

  const markAllRead = async () => {
    if (unreadCount === 0) return
    setMarkingAll(true)
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id)
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)

    if (error) {
      toast.error('No se pudieron marcar las notificaciones')
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success('Todas las notificaciones marcadas como leídas')
    }
    setMarkingAll(false)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          {unreadCount > 0 && (
            <p className="mt-0.5 text-sm text-gray-500">
              {unreadCount} sin leer
            </p>
          )}
        </div>
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0 || markingAll}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
            unreadCount > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'cursor-not-allowed bg-gray-100 text-gray-400',
          )}
        >
          <CheckCheck className="h-4 w-4" />
          Marcar todo como leído
        </button>
      </div>

      {/* Empty state */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Inbox className="h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No tenés notificaciones</p>
          <p className="text-xs text-gray-400">Cuando recibas una, aparecerá acá.</p>
        </div>
      )}

      {/* Groups */}
      <NotificationGroup label="Hoy" items={grouped.today} onRead={markOneRead} />
      <NotificationGroup label="Esta semana" items={grouped.thisWeek} onRead={markOneRead} />
      <NotificationGroup label="Anteriores" items={grouped.older} onRead={markOneRead} />
    </div>
  )
}
