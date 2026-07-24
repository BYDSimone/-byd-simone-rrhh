'use client'

import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Cake, Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  full_name: string
  area_id?: string | null
  role?: string
}

interface Request {
  id: string
  start_date: string
  end_date: string
  benefit_type: string
  status: string
  employee_id: string
  profiles?: { id: string; full_name: string; area_id?: string | null } | null
}

interface OvertimeRecord {
  id: string
  date: string
  hours: number
  type: string
  employee_id: string
  profiles?: { id: string; full_name: string } | null
}

interface BirthdayProfile {
  id: string
  full_name: string
  dob: string | null
}

interface Props {
  currentUserProfile: Profile
  initialRequests: Request[]
  initialOvertime: OvertimeRecord[]
  birthdays: BirthdayProfile[]
  serverMonth: number
  serverYear: number
}

// ─── Benefit type config ────────────────────────────────────────────────────

const BENEFIT_COLORS: Record<string, { bg: string; label: string }> = {
  vacation:          { bg: 'bg-emerald-500',  label: 'Vacaciones' },
  sick_leave:        { bg: 'bg-red-400',      label: 'Enfermedad' },
  personal:          { bg: 'bg-amber-400',    label: 'Personal' },
  study:             { bg: 'bg-purple-500',   label: 'Estudio' },
  maternity:         { bg: 'bg-pink-400',     label: 'Maternidad' },
  paternity:         { bg: 'bg-sky-400',      label: 'Paternidad' },
  bereavement:       { bg: 'bg-slate-500',    label: 'Duelo' },
  other:             { bg: 'bg-orange-400',   label: 'Otro' },
}

const OVERTIME_COLOR = 'bg-blue-500'
const BIRTHDAY_COLOR = 'bg-pink-400'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCalendarDays(month: Date) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end   = endOfWeek(endOfMonth(month),   { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

function requestsForDay(day: Date, requests: Request[]) {
  return requests.filter((r) => {
    try {
      const s = parseISO(r.start_date)
      const e = parseISO(r.end_date)
      return isWithinInterval(day, { start: s, end: e })
    } catch {
      return false
    }
  })
}

function overtimeForDay(day: Date, overtime: OvertimeRecord[]) {
  return overtime.filter((o) => {
    try {
      return isSameDay(parseISO(o.date), day)
    } catch {
      return false
    }
  })
}

function birthdaysForDay(day: Date, birthdays: BirthdayProfile[]) {
  return birthdays.filter((b) => {
    if (!b.dob) return false
    try {
      const d = parseISO(b.dob)
      return d.getUTCDate() === day.getDate()
    } catch {
      return false
    }
  })
}

// ─── Popover / Day Detail Panel ─────────────────────────────────────────────

function DayPanel({
  day,
  dayRequests,
  dayOvertime,
  dayBirthdays,
  onClose,
}: {
  day: Date
  dayRequests: Request[]
  dayOvertime: OvertimeRecord[]
  dayBirthdays: BirthdayProfile[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">
            {format(day, "EEEE d 'de' MMMM", { locale: es })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {dayRequests.length === 0 && dayOvertime.length === 0 && dayBirthdays.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">Sin eventos para este día.</p>
        )}

        {dayBirthdays.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-pink-500 mb-2 flex items-center gap-1">
              <Cake size={13} /> Cumpleaños
            </h4>
            <ul className="space-y-1">
              {dayBirthdays.map((b) => (
                <li key={b.id} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
                  {b.full_name}
                </li>
              ))}
            </ul>
          </section>
        )}

        {dayRequests.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1">
              <CalendarDays size={13} /> Ausencias
            </h4>
            <ul className="space-y-1">
              {dayRequests.map((r) => {
                const cfg = BENEFIT_COLORS[r.benefit_type] ?? BENEFIT_COLORS.other
                return (
                  <li key={r.id} className="text-sm text-gray-700 flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.bg)} />
                    <span className="font-medium">{r.profiles?.full_name ?? '—'}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">{cfg.label}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        )}

        {dayOvertime.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-2 flex items-center gap-1">
              <Clock size={13} /> Horas Extras
            </h4>
            <ul className="space-y-1">
              {dayOvertime.map((o) => (
                <li key={o.id} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="font-medium">{o.profiles?.full_name ?? '—'}</span>
                  <span className="text-gray-400">·</span>
                  <span className="text-gray-500">{o.hours}h — {o.type}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

// ─── Main Client Component ──────────────────────────────────────────────────

export default function CalendarClientPage({
  initialRequests,
  initialOvertime,
  birthdays,
  serverMonth,
  serverYear,
}: Props) {
  const [currentMonth, setCurrentMonth] = useState(
    new Date(serverYear, serverMonth, 1)
  )
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  const days = useMemo(() => getCalendarDays(currentMonth), [currentMonth])
  const WEEK_HEADERS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  const selectedRequests = selectedDay ? requestsForDay(selectedDay, initialRequests) : []
  const selectedOvertime = selectedDay ? overtimeForDay(selectedDay, initialOvertime) : []
  const selectedBirthdays = selectedDay ? birthdaysForDay(selectedDay, birthdays) : []

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendario del Equipo</h1>
            <p className="text-sm text-gray-500 mt-0.5">Ausencias, horas extras y cumpleaños</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-base font-semibold text-gray-800 capitalize min-w-[160px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </span>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 transition-colors"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Week day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {WEEK_HEADERS.map((h) => (
              <div
                key={h}
                className="py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, idx) => {
              const inMonth = isSameMonth(day, currentMonth)
              const isToday = isSameDay(day, new Date())
              const dayReqs = requestsForDay(day, initialRequests)
              const dayOvt  = overtimeForDay(day, initialOvertime)
              const dayBds  = birthdaysForDay(day, birthdays)
              const hasEvents = dayReqs.length > 0 || dayOvt.length > 0 || dayBds.length > 0

              return (
                <div
                  key={idx}
                  onClick={() => inMonth && setSelectedDay(day)}
                  className={cn(
                    'min-h-[80px] p-2 border-b border-r border-gray-50 transition-colors',
                    inMonth ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-50/60',
                    !inMonth && 'cursor-default',
                    idx % 7 === 6 && 'border-r-0'
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span
                      className={cn(
                        'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                        isToday
                          ? 'bg-blue-600 text-white font-bold'
                          : inMonth
                          ? 'text-gray-800'
                          : 'text-gray-300'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayBds.length > 0 && inMonth && (
                      <Cake size={12} className="text-pink-400 flex-shrink-0" />
                    )}
                  </div>

                  {inMonth && hasEvents && (
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {dayBds.map((b) => (
                        <span
                          key={`bd-${b.id}`}
                          className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0"
                          title={`🎂 ${b.full_name}`}
                        />
                      ))}
                      {dayReqs.slice(0, 4).map((r) => {
                        const cfg = BENEFIT_COLORS[r.benefit_type] ?? BENEFIT_COLORS.other
                        return (
                          <span
                            key={`req-${r.id}`}
                            className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.bg)}
                            title={`${r.profiles?.full_name} — ${cfg.label}`}
                          />
                        )
                      })}
                      {dayOvt.slice(0, 3).map((o) => (
                        <span
                          key={`ovt-${o.id}`}
                          className={cn('w-2 h-2 rounded-full flex-shrink-0', OVERTIME_COLOR)}
                          title={`${o.profiles?.full_name} — ${o.hours}h extra`}
                        />
                      ))}
                      {dayReqs.length + dayOvt.length > 7 && (
                        <span className="text-[9px] text-gray-400 leading-none self-center">
                          +{dayReqs.length + dayOvt.length - 7}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-3">
          {Object.entries(BENEFIT_COLORS).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full', cfg.bg)} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', OVERTIME_COLOR)} />
            <span className="text-xs text-gray-500">Horas extra</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn('w-2.5 h-2.5 rounded-full', BIRTHDAY_COLOR)} />
            <span className="text-xs text-gray-500">Cumpleaños</span>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay && (
        <DayPanel
          day={selectedDay}
          dayRequests={selectedRequests}
          dayOvertime={selectedOvertime}
          dayBirthdays={selectedBirthdays}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  )
}
