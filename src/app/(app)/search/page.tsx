'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/dates'
import {
  Search,
  Loader2,
  FileText,
  Clock,
  Users,
  X,
  ChevronRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RequestResult {
  id: string
  type: 'request'
  title: string
  subtitle: string
  href: string
  meta: string
}

interface OvertimeResult {
  id: string
  type: 'overtime'
  title: string
  subtitle: string
  href: string
  meta: string
}

interface MemberResult {
  id: string
  type: 'member'
  title: string
  subtitle: string
  href: string
  meta: string
}

type SearchResult = RequestResult | OvertimeResult | MemberResult

interface GroupedResults {
  requests: RequestResult[]
  overtime: OvertimeResult[]
  members: MemberResult[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function groupResults(results: SearchResult[]): GroupedResults {
  return {
    requests: results.filter((r): r is RequestResult => r.type === 'request'),
    overtime: results.filter((r): r is OvertimeResult => r.type === 'overtime'),
    members: results.filter((r): r is MemberResult => r.type === 'member'),
  }
}

// ─── Result Item ──────────────────────────────────────────────────────────────

const typeConfig = {
  request: {
    icon: FileText,
    label: 'Solicitudes',
    color: 'text-blue-500 bg-blue-50',
  },
  overtime: {
    icon: Clock,
    label: 'Horas extra',
    color: 'text-purple-500 bg-purple-50',
  },
  member: {
    icon: Users,
    label: 'Colaboradores',
    color: 'text-green-500 bg-green-50',
  },
}

function ResultItem({ result }: { result: SearchResult }) {
  const config = typeConfig[result.type]
  const Icon = config.icon

  return (
    <Link
      href={result.href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 group"
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-800 truncate">{result.title}</p>
        <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>{result.meta}</span>
        <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

function ResultGroup({
  label,
  icon: Icon,
  results,
  color,
}: {
  label: string
  icon: React.ElementType
  results: SearchResult[]
  color: string
}) {
  if (results.length === 0) return null
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 pb-1">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <span className="ml-auto text-xs text-gray-400">{results.length}</span>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
        {results.map((r) => (
          <ResultItem key={r.id} result={r} />
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  const debouncedQuery = useDebounce(query.trim(), 400)

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const runSearch = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) {
        setResults([])
        setSearched(false)
        return
      }

      setLoading(true)
      setSearched(true)
      const pattern = `%${q}%`
      const all: SearchResult[] = []

      // Search requests (by requester name or request type)
      const { data: requests } = await supabase
        .from('requests')
        .select(
          `id, type, status, created_at,
           requester:profiles!requests_requester_id_fkey(full_name)`,
        )
        .or(`type.ilike.${pattern}`)
        .limit(10)

      if (requests) {
        for (const r of requests) {
          const requester = Array.isArray(r.requester) ? r.requester[0] : r.requester
          all.push({
            id: r.id,
            type: 'request',
            title: r.type ?? 'Solicitud',
            subtitle: (requester as { full_name: string } | null)?.full_name ?? 'Sin solicitante',
            href: `/requests/${r.id}`,
            meta: formatDate(r.created_at),
          })
        }
      }

      // Search requests by employee name (join)
      const { data: requestsByName } = await supabase
        .from('requests')
        .select(
          `id, type, status, created_at,
           requester:profiles!requests_requester_id_fkey(id, full_name)`,
        )
        .limit(10)

      if (requestsByName) {
        for (const r of requestsByName) {
          const requester = Array.isArray(r.requester) ? r.requester[0] : r.requester
          const name = (requester as { id: string; full_name: string } | null)?.full_name ?? ''
          if (name.toLowerCase().includes(q.toLowerCase())) {
            const alreadyAdded = all.find((x) => x.id === r.id && x.type === 'request')
            if (!alreadyAdded) {
              all.push({
                id: r.id,
                type: 'request',
                title: r.type ?? 'Solicitud',
                subtitle: name,
                href: `/requests/${r.id}`,
                meta: formatDate(r.created_at),
              })
            }
          }
        }
      }

      // Search overtime records
      const { data: overtime } = await supabase
        .from('overtime_records')
        .select(
          `id, date, hours, reason,
           employee:profiles!overtime_records_employee_id_fkey(full_name)`,
        )
        .or(`reason.ilike.${pattern}`)
        .limit(10)

      if (overtime) {
        for (const o of overtime) {
          const emp = Array.isArray(o.employee) ? o.employee[0] : o.employee
          all.push({
            id: o.id,
            type: 'overtime',
            title: (emp as { full_name: string } | null)?.full_name ?? 'Sin empleado',
            subtitle: o.reason ?? 'Sin motivo',
            href: `/overtime/${o.id}`,
            meta: formatDate(o.date),
          })
        }
      }

      // Search overtime by employee name
      const { data: overtimeByName } = await supabase
        .from('overtime_records')
        .select(
          `id, date, hours, reason,
           employee:profiles!overtime_records_employee_id_fkey(id, full_name)`,
        )
        .limit(20)

      if (overtimeByName) {
        for (const o of overtimeByName) {
          const emp = Array.isArray(o.employee) ? o.employee[0] : o.employee
          const name = (emp as { id: string; full_name: string } | null)?.full_name ?? ''
          if (name.toLowerCase().includes(q.toLowerCase())) {
            const alreadyAdded = all.find((x) => x.id === o.id && x.type === 'overtime')
            if (!alreadyAdded) {
              all.push({
                id: o.id,
                type: 'overtime',
                title: name,
                subtitle: o.reason ?? 'Sin motivo',
                href: `/overtime/${o.id}`,
                meta: formatDate(o.date),
              })
            }
          }
        }
      }

      // Search members by name or position
      const { data: members } = await supabase
        .from('profiles')
        .select('id, full_name, position, sucursal')
        .or(`full_name.ilike.${pattern},position.ilike.${pattern}`)
        .eq('is_active', true)
        .limit(10)

      if (members) {
        for (const m of members) {
          all.push({
            id: m.id,
            type: 'member',
            title: m.full_name ?? 'Sin nombre',
            subtitle: m.position ?? 'Sin cargo',
            href: `/team/${m.id}`,
            meta: m.sucursal ?? '',
          })
        }
      }

      setResults(all)
      setLoading(false)
    },
    [supabase],
  )

  useEffect(() => {
    runSearch(debouncedQuery)
  }, [debouncedQuery, runSearch])

  const grouped = groupResults(results)
  const totalResults = results.length
  const hasResults = totalResults > 0

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Search input */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Buscar solicitudes, horas extra, colaboradores..."
          className="w-full rounded-2xl border border-gray-300 bg-white py-3.5 pl-12 pr-10 text-base text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false) }}
            className="absolute inset-y-0 right-3 flex items-center p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* States */}
      {!searched && !loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-400">
            Escribí al menos 2 caracteres para buscar
          </p>
        </div>
      )}

      {searched && !loading && !hasResults && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Search className="h-12 w-12 text-gray-200" />
          <p className="text-sm font-medium text-gray-500">Sin resultados para "{debouncedQuery}"</p>
          <p className="text-xs text-gray-400">Probá con otro término o revisá la ortografía</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-5">
          <p className="text-xs text-gray-400 px-1">
            {totalResults} resultado{totalResults !== 1 ? 's' : ''} para "{debouncedQuery}"
          </p>
          <ResultGroup
            label={typeConfig.request.label}
            icon={typeConfig.request.icon}
            results={grouped.requests}
            color="text-blue-500"
          />
          <ResultGroup
            label={typeConfig.overtime.label}
            icon={typeConfig.overtime.icon}
            results={grouped.overtime}
            color="text-purple-500"
          />
          <ResultGroup
            label={typeConfig.member.label}
            icon={typeConfig.member.icon}
            results={grouped.members}
            color="text-green-500"
          />
        </div>
      )}
    </div>
  )
}
