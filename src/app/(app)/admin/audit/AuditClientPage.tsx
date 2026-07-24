'use client'

import { useState, useMemo } from 'react'
import { formatDate } from '@/lib/utils/dates'
import { cn } from '@/lib/utils'
import type { AuditLog } from './page'
import {
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<AuditLog['action'], { label: string; color: string; icon: React.ElementType }> = {
  INSERT: { label: 'Creación', color: 'text-green-700 bg-green-50', icon: Plus },
  UPDATE: { label: 'Modificación', color: 'text-blue-700 bg-blue-50', icon: Pencil },
  DELETE: { label: 'Eliminación', color: 'text-red-700 bg-red-50', icon: Trash2 },
}

function getChangedFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  action: AuditLog['action'],
): Array<{ field: string; from: string; to: string }> {
  if (action === 'INSERT' || !oldData || !newData) return []

  const IGNORED = ['updated_at', 'created_at']
  const changes: Array<{ field: string; from: string; to: string }> = []

  for (const key of Object.keys(newData)) {
    if (IGNORED.includes(key)) continue
    const oldVal = oldData[key]
    const newVal = newData[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        from: oldVal === null || oldVal === undefined ? '—' : String(oldVal),
        to: newVal === null || newVal === undefined ? '—' : String(newVal),
      })
    }
  }
  return changes
}

function truncate(s: string, max = 30) {
  return s.length > max ? s.slice(0, max) + '…' : s
}

// ─── Filters bar ─────────────────────────────────────────────────────────────

interface Filters {
  table_name: string
  action: string
  dateFrom: string
  dateTo: string
}

function FiltersBar({
  logs,
  filters,
  onChange,
  onClear,
}: {
  logs: AuditLog[]
  filters: Filters
  onChange: (f: Partial<Filters>) => void
  onClear: () => void
}) {
  const tableNames = useMemo(
    () => [...new Set(logs.map((l) => l.table_name))].sort(),
    [logs],
  )

  const hasActive = Object.values(filters).some(Boolean)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <Filter className="mb-2 h-4 w-4 shrink-0 text-gray-400" />

        {/* Table name */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Tabla</label>
          <div className="relative">
            <select
              value={filters.table_name}
              onChange={(e) => onChange({ table_name: e.target.value })}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas</option>
              {tableNames.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Action */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Acción</label>
          <div className="relative">
            <select
              value={filters.action}
              onChange={(e) => onChange({ action: e.target.value })}
              className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="INSERT">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Date from */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Desde</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ dateFrom: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Date to */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500">Hasta</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ dateTo: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {hasActive && (
          <button
            onClick={onClear}
            className="mb-0.5 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ log }: { log: AuditLog }) {
  const [expanded, setExpanded] = useState(false)
  const config = ACTION_CONFIG[log.action]
  const Icon = config.icon
  const changes = getChangedFields(log.old_data, log.new_data, log.action)

  // For INSERT show new data fields summary
  const insertedFields = log.action === 'INSERT' && log.new_data
    ? Object.entries(log.new_data)
        .filter(([k]) => !['id', 'created_at', 'updated_at'].includes(k))
        .slice(0, 3)
    : []

  return (
    <>
      <tr
        className={cn(
          'hover:bg-gray-50 transition-colors',
          (changes.length > 0 || insertedFields.length > 0) && 'cursor-pointer',
        )}
        onClick={() => {
          if (changes.length > 0 || insertedFields.length > 0) setExpanded((v) => !v)
        }}
      >
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
          {new Date(log.created_at).toLocaleString('es-AR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-medium text-gray-800">{log.user_full_name ?? 'Sistema'}</div>
          {log.user_email && (
            <div className="text-xs text-gray-400">{log.user_email}</div>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.color)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-mono text-gray-600">{log.table_name}</td>
        <td className="px-4 py-3 text-xs text-gray-400 font-mono">
          {log.record_id ? truncate(log.record_id, 12) : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-gray-500">
          {log.action === 'UPDATE' && changes.length > 0 && (
            <span>{changes.length} campo{changes.length !== 1 ? 's' : ''} modificado{changes.length !== 1 ? 's' : ''}</span>
          )}
          {log.action === 'INSERT' && <span className="text-green-600">Nuevo registro</span>}
          {log.action === 'DELETE' && <span className="text-red-500">Registro eliminado</span>}
        </td>
      </tr>

      {/* Expanded detail */}
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={6} className="px-6 py-3">
            {log.action === 'UPDATE' && changes.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Cambios (primeros {Math.min(changes.length, 3)} de {changes.length})
                </p>
                {changes.slice(0, 3).map((c) => (
                  <div key={c.field} className="flex items-center gap-2 text-xs">
                    <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700">{c.field}</code>
                    <span className="text-red-500 line-through">{truncate(c.from)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600">{truncate(c.to)}</span>
                  </div>
                ))}
              </div>
            )}
            {log.action === 'INSERT' && insertedFields.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Campos creados</p>
                {insertedFields.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <code className="rounded bg-gray-200 px-1.5 py-0.5 font-mono text-gray-700">{k}</code>
                    <span className="text-green-600">{truncate(String(v ?? '—'))}</span>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

const EMPTY_FILTERS: Filters = { table_name: '', action: '', dateFrom: '', dateTo: '' }

export default function AuditClientPage({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)

  const updateFilter = (partial: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...partial }))

  const filtered = useMemo(() => {
    return initialLogs.filter((l) => {
      if (filters.table_name && l.table_name !== filters.table_name) return false
      if (filters.action && l.action !== filters.action) return false
      if (filters.dateFrom && l.created_at < filters.dateFrom) return false
      if (filters.dateTo && l.created_at > filters.dateTo + 'T23:59:59') return false
      return true
    })
  }, [initialLogs, filters])

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auditoría</h1>
          <p className="text-sm text-gray-500">
            Últimos {initialLogs.length} registros — {filtered.length} visibles
          </p>
        </div>
      </div>

      {/* Filters */}
      <FiltersBar
        logs={initialLogs}
        filters={filters}
        onChange={updateFilter}
        onClear={() => setFilters(EMPTY_FILTERS)}
      />

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <ShieldCheck className="h-12 w-12 text-gray-200" />
          <p className="text-sm text-gray-500">No hay registros que coincidan con los filtros</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Fecha/hora', 'Usuario', 'Acción', 'Tabla', 'ID registro', 'Resumen'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((log) => (
                <LogRow key={log.id} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Los registros de auditoría son de solo lectura. Se muestran los últimos 200.
      </p>
    </div>
  )
}
