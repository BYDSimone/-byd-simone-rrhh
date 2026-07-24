import {
  format, formatDistanceToNow, parseISO,
  differenceInDays, differenceInYears, isToday, isTomorrow
} from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: es })
}

export function formatDateTime(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'a las' HH:mm", { locale: es })
}

export function formatRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: es })
}

export function formatDateRange(start: string, end: string) {
  const s = parseISO(start)
  const e = parseISO(end)
  if (start === end) return format(s, "d 'de' MMMM 'de' yyyy", { locale: es })
  return `${format(s, 'd MMM', { locale: es })} → ${format(e, "d MMM yyyy", { locale: es })}`
}

export function getAntiguedad(hireDate: string) {
  const years = differenceInYears(new Date(), parseISO(hireDate))
  if (years === 0) {
    const days = differenceInDays(new Date(), parseISO(hireDate))
    return `${days} día${days !== 1 ? 's' : ''}`
  }
  return `${years} año${years !== 1 ? 's' : ''}`
}

export function getAge(birthDate: string) {
  return differenceInYears(new Date(), parseISO(birthDate))
}

export function isBirthdayToday(birthDate: string) {
  const today = new Date()
  const birth = parseISO(birthDate)
  return today.getDate() === birth.getDate() && today.getMonth() === birth.getMonth()
}

export function isBirthdayTomorrow(birthDate: string) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const birth = parseISO(birthDate)
  return tomorrow.getDate() === birth.getDate() && tomorrow.getMonth() === birth.getMonth()
}

export function formatHours(hours: number) {
  const h    = Math.floor(hours)
  const mins = Math.round((hours - h) * 60)
  if (mins === 0) return `${h}h`
  return `${h}h ${mins}min`
}

export function hoursToHalfDays(hours: number, hoursPerDay = 8) {
  return (hours / hoursPerDay) * 2 / 2 // en medios días
}

export function hoursToDays(hours: number, hoursPerDay = 8) {
  return hours / hoursPerDay
}
