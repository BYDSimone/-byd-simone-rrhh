'use client'

import { useState, useMemo } from 'react'
import {
  Search, Plus, X, Pencil, Trash2, ChevronRight,
  Calendar, AlertTriangle, Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { BenefitBalance } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────
interface Employee {
  id:            string
  full_name:     string
  employee_code: string | null
  area_id:       string | null
  area?:         { id: string; name: string; color: string } | null
}

interface BenefitType {
  id:    string
  code:  string
  name:  string
  color: string
}

interface Props {
  employees:       Employee[]
  benefitTypes:    BenefitType[]
  initialBalances: BenefitBalance[]
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

// ─── Main ─────────────────────────────────────────────────────
export function BalancesClientPage({ employees, benefitTypes, initialBalances }: Props) {
  const supabase = createClient()

  const [balances, setBalances]         = useState<BenefitBalance[]>(initialBalances)
  const [search, setSearch]             = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [showModal, setShowModal]       = useState(false)
  const [editingBalance, setEditingBalance] = useState<BenefitBalance | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<BenefitBalance | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return employees
    return employees.filter(e =>
      e.full_name.toLowerCase().includes(q) ||
      e.employee_code?.toLowerCase().includes(q) ||
      e.area?.name.toLowerCase().includes(q)
    )
  }, [employees, search])

  const employeeBalances = useMemo(() => {
    if (!selectedEmployee) return []
    return balances
      .filter(b => b.employee_id === selectedEmployee.id)
      .sort((a, b) => b.year - a.year || a.benefit_type_id.localeCompare(b.benefit_type_id))
  }, [balances, selectedEmployee])

  function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }

  function getBenefitType(id: string) {
    return benefitTypes.find(bt => bt.id === id)
  }

  function balanceCountFor(emp: Employee) {
    return balances.filter(b => b.employee_id === emp.id && b.year === CURRENT_YEAR).length
  }

  async function handleSaveBalance(data: {
    benefit_type_id: string
    year: number
    total_granted: number
    notes: string
  }) {
    if (!selectedEmployee) return

    if (editingBalance) {
      const { data: updated, error } = await supabase
        .from('benefit_balances')
        .update({
          benefit_type_id: data.benefit_type_id,
          year:            data.year,
          total_granted:   data.total_granted,
          available:       data.total_granted - (editingBalance.used ?? 0) - (editingBalance.pending ?? 0),
          notes:           data.notes || null,
        })
        .eq('id', editingBalance.id)
        .select('*')
        .single()

      if (error) { toast.error(error.message); return }
      setBalances(prev => prev.map(b => b.id === editingBalance.id ? updated : b))
      toast.success('Balance actualizado')
    } else {
      const exists = balances.find(
        b => b.employee_id === selectedEmployee.id &&
             b.benefit_type_id === data.benefit_type_id &&
             b.year === data.year
      )
      if (exists) {
        toast.error('Ya existe un balance para ese tipo y año. Editalo directamente.')
        return
      }

      const { data: created, error } = await supabase
        .from('benefit_balances')
        .insert({
          employee_id:     selectedEmployee.id,
          benefit_type_id: data.benefit_type_id,
          year:            data.year,
          total_granted:   data.total_granted,
          used:            0,
          pending:         0,
          available:       data.total_granted,
          notes:           data.notes || null,
        })
        .select('*')
        .single()

      if (error) { toast.error(error.message); return }
      setBalances(prev => [...prev, created])
      toast.success('Balance cargado correctamente')
    }

    setShowModal(false)
    setEditingBalance(null)
  }

  async function handleDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    const { error } = await supabase
      .from('benefit_balances')
      .delete()
      .eq('id', deleteConfirm.id)

    if (error) {
      toast.error('Error al eliminar el balance.')
    } else {
      setBalances(prev => prev.filter(b => b.id !== deleteConfirm.id))
      toast.success('Balance eliminado')
    }
    setDeleting(false)
    setDeleteConfirm(null)
  }

  return (
    <div className="flex h-full min-h-screen">

      {/* ── Columna izquierda: lista de empleados ── */}
      <div className="w-80 flex-shrink-0 border-r border-border bg-surface flex flex-col">

        <div className="p-4 border-b border-border">
          <h1 className="text-lg font-bold tracking-tight">Balances de licencias</h1>
          <p className="text-xs text-text-muted mt-0.5">Seleccioná un empleado para gestionar sus saldos</p>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              placeholder="Buscar empleado..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input pl-8 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredEmployees.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-8">Sin resultados</p>
          ) : (
            filteredEmployees.map(emp => {
              const count = balanceCountFor(emp)
              const isSelected = selectedEmployee?.id === emp.id
              return (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmployee(emp)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/50 transition-colors',
                    isSelected
                      ? 'bg-brand-50 border-l-2 border-l-brand-500'
                      : 'hover:bg-bg-hover'
                  )}
                >
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-brand-700">{getInitials(emp.full_name)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{emp.full_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {emp.area && (
                        <span className="flex items-center gap-1 text-xs text-text-muted">
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: emp.area.color }}
                          />
                          {emp.area.name}
                        </span>
                      )}
                      {emp.employee_code && (
                        <span className="text-xs text-text-muted font-mono">#{emp.employee_code}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {count > 0 && (
                      <span className="text-xs bg-brand-100 text-brand-700 font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    <ChevronRight size={14} className="text-text-muted flex-shrink-0" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!selectedEmployee ? (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-center p-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Wallet size={28} className="text-slate-400" />
            </div>
            <p className="font-semibold text-text-secondary">Seleccioná un empleado</p>
            <p className="text-sm text-text-muted max-w-xs">
              Hacé clic en un colaborador de la lista para ver y gestionar sus saldos de licencias.
            </p>
          </div>
        ) : (
          <>
            <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-brand-700">{getInitials(selectedEmployee.full_name)}</span>
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">{selectedEmployee.full_name}</h2>
                  {selectedEmployee.area && (
                    <p className="text-sm text-text-muted flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedEmployee.area.color }}
                      />
                      {selectedEmployee.area.name}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => { setEditingBalance(null); setShowModal(true) }}
                className="btn-primary"
              >
                <Plus size={15} />
                Cargar saldo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {employeeBalances.length === 0 ? (
                <div className="card flex flex-col items-center gap-3 py-12 text-center">
                  <Calendar size={32} className="text-slate-300" />
                  <p className="font-semibold text-text-secondary">Sin balances cargados</p>
                  <p className="text-sm text-text-muted">
                    Usá el botón "Cargar saldo" para agregar vacaciones u otros beneficios.
                  </p>
                  <button
                    onClick={() => { setEditingBalance(null); setShowModal(true) }}
                    className="btn-secondary mt-2"
                  >
                    <Plus size={14} />
                    Cargar primer saldo
                  </button>
                </div>
              ) : (
                (() => {
                  const byYear: Record<number, BenefitBalance[]> = {}
                  employeeBalances.forEach(b => {
                    if (!byYear[b.year]) byYear[b.year] = []
                    byYear[b.year].push(b)
                  })
                  return Object.entries(byYear)
                    .sort(([a], [b]) => Number(b) - Number(a))
                    .map(([year, bals]) => (
                      <div key={year} className="mb-6">
                        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Calendar size={13} />
                          {year}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {bals.map(bal => {
                            const bt = getBenefitType(bal.benefit_type_id)
                            const pct = bal.total_granted > 0
                              ? Math.round((bal.available / bal.total_granted) * 100)
                              : 0
                            return (
                              <div key={bal.id} className="card p-4 group relative">
                                <div
                                  className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                                  style={{ backgroundColor: bt?.color ?? '#94a3b8' }}
                                />

                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => { setEditingBalance(bal); setShowModal(true) }}
                                    className="p-1.5 rounded text-text-muted hover:text-brand-600 hover:bg-brand-50"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(bal)}
                                    className="p-1.5 rounded text-text-muted hover:text-status-rejected hover:bg-red-50"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <p className="text-sm font-semibold text-text-primary mt-1 pr-14">
                                  {bt?.name ?? 'Beneficio'}
                                </p>

                                <div className="mt-3 space-y-1.5">
                                  <div className="flex justify-between text-xs text-text-muted">
                                    <span>Disponibles</span>
                                    <span className="font-semibold text-text-primary">
                                      {bal.available} / {bal.total_granted} días
                                    </span>
                                  </div>

                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: bt?.color ?? '#94a3b8',
                                      }}
                                    />
                                  </div>

                                  <div className="flex justify-between text-xs text-text-muted">
                                    <span>Usados: {bal.used}</span>
                                    {bal.pending > 0 && (
                                      <span className="text-amber-600">Pendientes: {bal.pending}</span>
                                    )}
                                  </div>
                                </div>

                                {bal.notes && (
                                  <p className="mt-2 text-xs text-text-muted italic truncate" title={bal.notes}>
                                    {bal.notes}
                                  </p>
                                )}

                                {bal.expires_at && (
                                  <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle size={11} />
                                    Vence {new Date(bal.expires_at).toLocaleDateString('es-AR')}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                })()
              )}
            </div>
          </>
        )}
      </div>

      {showModal && selectedEmployee && (
        <BalanceFormModal
          benefitTypes={benefitTypes}
          editingBalance={editingBalance}
          onSave={handleSaveBalance}
          onClose={() => { setShowModal(false); setEditingBalance(null) }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
          <div className="card p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-status-rejected" />
              </div>
              <div>
                <h3 className="font-semibold">Eliminar balance</h3>
                <p className="text-sm text-text-muted">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-text-secondary mb-5">
              ¿Confirmás que querés eliminar el balance de{' '}
              <strong>{getBenefitType(deleteConfirm.benefit_type_id)?.name}</strong>{' '}
              ({deleteConfirm.year})?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} disabled={deleting} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger">
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Balance Form Modal ───────────────────────────────────────
function BalanceFormModal({
  benefitTypes,
  editingBalance,
  onSave,
  onClose,
}: {
  benefitTypes:    BenefitType[]
  editingBalance:  BenefitBalance | null
  onSave:          (data: { benefit_type_id: string; year: number; total_granted: number; notes: string }) => Promise<void>
  onClose:         () => void
}) {
  const [benefitTypeId, setBenefitTypeId] = useState(editingBalance?.benefit_type_id ?? '')
  const [year, setYear]                   = useState(editingBalance?.year ?? CURRENT_YEAR)
  const [totalGranted, setTotalGranted]   = useState(editingBalance?.total_granted?.toString() ?? '')
  const [notes, setNotes]                 = useState(editingBalance?.notes ?? '')
  const [saving, setSaving]               = useState(false)

  async function handleSubmit() {
    if (!benefitTypeId) { toast.error('Seleccioná el tipo de licencia'); return }
    const days = parseFloat(totalGranted)
    if (isNaN(days) || days < 0) { toast.error('Ingresá una cantidad válida de días'); return }

    setSaving(true)
    await onSave({ benefit_type_id: benefitTypeId, year, total_granted: days, notes })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 animate-fade-in">
      <div className="card w-full max-w-md animate-slide-up">

        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-semibold text-text-primary">
            {editingBalance ? 'Editar balance' : 'Cargar nuevo saldo'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded text-text-muted hover:bg-bg-hover">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">

          <div>
            <label className="form-label">Tipo de licencia</label>
            <select
              value={benefitTypeId}
              onChange={e => setBenefitTypeId(e.target.value)}
              className="form-input"
            >
              <option value="">— Seleccioná —</option>
              {benefitTypes.map(bt => (
                <option key={bt.id} value={bt.id}>{bt.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Año</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="form-input"
            >
              {YEAR_OPTIONS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Días otorgados</label>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Ej: 14"
              value={totalGranted}
              onChange={e => setTotalGranted(e.target.value)}
              className="form-input"
            />
            <p className="text-xs text-text-muted mt-1">
              Podés ingresar medios días (ej: 0.5, 1.5)
            </p>
          </div>

          <div>
            <label className="form-label">Notas internas (opcional)</label>
            <input
              type="text"
              placeholder="Ej: según convenio 2025, proporcionado..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end p-5 border-t border-border">
          <button onClick={onClose} disabled={saving} className="btn-secondary">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Guardando...' : editingBalance ? 'Guardar cambios' : 'Cargar saldo'}
          </button>
        </div>
      </div>
    </div>
  )
}
