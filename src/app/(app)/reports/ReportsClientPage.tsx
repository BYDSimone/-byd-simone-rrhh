'use client'

import { useState, useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Download, AlertTriangle, Clock, CalendarDays, ListChecks } from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Request {
  id: string
  start_date: string
  end_date: string
  benefit_type: string
  status: string
  employee_id: string
  profiles?: {
    id: string
    full_name: string
    area_id?: string | null
    areas?: { id: string; name: string } | null
  } | null
}

interface OvertimeRecord {
  id: string
  date: string
  hours: number
  type: string
  employee_id: string
  profiles?: { id: string; full_name: string; area_id?: string | null } | null
}

interface Balance {
  id: string
  employee_id: string
  benefit_type: string
  remaining_days: number
  profiles?: {
    id: string
    full_name: string
    area_id?: string | null
    areas?: { id: string; name: string } | null
  } | null
}

interface PendingRequest {
  id: string
  benefit_type: string
  status: string
}

interface Props {
  absRequests: Request[]
  overtimeRecords: OvertimeRecord[]
  balances: Balance[]
  pendingRequests: PendingRequest[]
  currentRole: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const BENEFIT_COLORS: Record<string, string> = {
  vacation:    '#10b981',
  sick_leave:  '#f87171',
  personal:    '#fbbf24',
  study:       '#a78bfa',
  maternity:   '#f472b6',
  paternity:   '#38bdf8',
  bereavement: '#94a3b8',
  other:       '#fb923c',
}

const BENEFIT_LABELS: Record<string, string> = {
  vacation:    'Vacaciones',
  sick_leave:  'Enfermedad',
  personal:    'Personal',
  study:       'Estudio',
  maternity:   'Maternidad',
  paternity:   'Paternidad',
  bereavement: 'Duelo',
  other:       'Otro',
}

const OVERTIME_TYPES = ['50%', '100%', 'nocturnal']

// ─── Build last-12-months axis ───────────────────────────────────────────────

function buildMonthLabels() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = startOfMonth(subMonths(now, 11 - i))
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }) }
  })
}

// ─── Absenteeism Tab ─────────────────────────────────────────────────────────

function AbsenteeismTab({ requests }: { requests: Request[] }) {
  const monthLabels = buildMonthLabels()
  const benefitTypes = Object.keys(BENEFIT_LABELS)

  // Chart data: per month, count per benefit type
  const chartData = monthLabels.map(({ key, label }) => {
    const row: Record<string, string | number> = { month: label }
    for (const bt of benefitTypes) {
      row[bt] = requests.filter((r) => {
        const m = r.start_date?.slice(0, 7)
        return m === key && r.benefit_type === bt
      }).length
    }
    return row
  })

  // Area table
  const areaMap: Record<string, { name: string; count: number }> = {}
  for (const r of requests) {
    const areaId = r.profiles?.area_id ?? 'unknown'
    const areaName = r.profiles?.areas?.name ?? 'Sin área'
    if (!areaMap[areaId]) areaMap[areaId] = { name: areaName, count: 0 }
    areaMap[areaId].count++
  }
  const areaRows = Object.values(areaMap).sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Solicitudes por mes (últimos 12 meses)</h3>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {benefitTypes.map((bt) => (
                <Bar
                  key={bt}
                  dataKey={bt}
                  name={BENEFIT_LABELS[bt]}
                  stackId="a"
                  fill={BENEFIT_COLORS[bt]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Resumen por área</h3>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Área</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total solicitudes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {areaRows.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                    Sin datos
                  </td>
                </tr>
              )}
              {areaRows.map((row) => (
                <tr key={row.name} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{row.name}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Overtime Tab ─────────────────────────────────────────────────────────────

function OvertimeTab({ records }: { records: OvertimeRecord[] }) {
  const monthLabels = buildMonthLabels()
  const [selectedMonth, setSelectedMonth] = useState(monthLabels[11].key)

  const filtered = records.filter((r) => r.date?.slice(0, 7) === selectedMonth)

  // Group by employee
  const empMap: Record<
    string,
    { name: string; total: number; byType: Record<string, number> }
  > = {}
  for (const r of filtered) {
    const id = r.employee_id
    const name = r.profiles?.full_name ?? '—'
    if (!empMap[id]) empMap[id] = { name, total: 0, byType: {} }
    empMap[id].total += r.hours
    empMap[id].byType[r.type] = (empMap[id].byType[r.type] ?? 0) + r.hours
  }
  const rows = Object.values(empMap).sort((a, b) => b.total - a.total)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-600">Mes:</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthLabels.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Empleado</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Total horas</th>
              {OVERTIME_TYPES.map((t) => (
                <th key={t} className="px-4 py-3 text-right font-semibold text-gray-600">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Sin registros para este mes
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.name} className="bg-white hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.total}h</td>
                {OVERTIME_TYPES.map((t) => (
                  <td key={t} className="px-4 py-3 text-right text-gray-600">
                    {row.byType[t] ? `${row.byType[t]}h` : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Balances Tab ─────────────────────────────────────────────────────────────

function BalancesTab({ balances }: { balances: Balance[] }) {
  const vacBalances = balances.filter((b) => b.benefit_type === 'vacation')
  const sorted = [...vacBalances].sort(
    (a, b) => a.remaining_days - b.remaining_days
  )

  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Empleado</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Área</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">Días restantes</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                Sin datos de saldos
              </td>
            </tr>
          )}
          {sorted.map((b) => {
            const isLow = b.remaining_days < 3
            return (
              <tr key={b.id} className={cn('bg-white hover:bg-gray-50', isLow && 'bg-red-50/60 hover:bg-red-50')}>
                <td className="px-4 py-3 font-medium text-gray-700">
                  {b.profiles?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {b.profiles?.areas?.name ?? '—'}
                </td>
                <td
                  className={cn(
                    'px-4 py-3 text-right font-semibold',
                    isLow ? 'text-red-600' : 'text-gray-900'
                  )}
                >
                  {b.remaining_days}
                </td>
                <td className="px-4 py-3 text-right">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                      <AlertTriangle size={10} /> Bajo
                    </span>
                  ) : (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Summary Tab ─────────────────────────────────────────────────────────────

function SummaryTab({
  pendingRequests,
  overtimeRecords,
  balances,
}: {
  pendingRequests: PendingRequest[]
  overtimeRecords: OvertimeRecord[]
  balances: Balance[]
}) {
  const pendingByType: Record<string, number> = {}
  for (const r of pendingRequests) {
    pendingByType[r.benefit_type] = (pendingByType[r.benefit_type] ?? 0) + 1
  }

  const lowBalances = balances.filter(
    (b) => b.benefit_type === 'vacation' && b.remaining_days < 3
  )

  const currentMonthKey = format(new Date(), 'yyyy-MM')
  const thisMonthOvertime = overtimeRecords.filter(
    (r) => r.date?.slice(0, 7) === currentMonthKey
  )
  const totalOvertimeHours = thisMonthOvertime.reduce((acc, r) => acc + r.hours, 0)

  const cards = [
    {
      label: 'Solicitudes pendientes',
      value: pendingRequests.length,
      icon: <ListChecks size={20} className="text-amber-500" />,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Horas extra este mes',
      value: `${totalOvertimeHours}h`,
      icon: <Clock size={20} className="text-blue-500" />,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Empleados con saldo bajo',
      value: lowBalances.length,
      icon: <AlertTriangle size={20} className="text-red-500" />,
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={cn('rounded-xl p-5 flex items-center gap-4', c.bg)}>
            <div className="flex-shrink-0">{c.icon}</div>
            <div>
              <div className={cn('text-2xl font-bold', c.text)}>{c.value}</div>
              <div className="text-sm text-gray-600">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Pendientes por tipo</h3>
        <div className="overflow-hidden rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Cantidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Object.entries(pendingByType).length === 0 && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                    Sin solicitudes pendientes
                  </td>
                </tr>
              )}
              {Object.entries(pendingByType).map(([type, count]) => (
                <tr key={type} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">
                    {BENEFIT_LABELS[type] ?? type}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function exportXLS(
  absRequests: Request[],
  overtimeRecords: OvertimeRecord[],
  balances: Balance[]
) {
  try {
    const ExcelJS = (await import('exceljs')).default
    const wb = new ExcelJS.Workbook()
    wb.creator = 'BYD Simone HR'
    wb.created = new Date()

    // Sheet 1: Absences
    const wsAbs = wb.addWorksheet('Ausentismo')
    wsAbs.columns = [
      { header: 'Empleado', key: 'name', width: 28 },
      { header: 'Fecha inicio', key: 'start', width: 14 },
      { header: 'Fecha fin', key: 'end', width: 14 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Área', key: 'area', width: 20 },
    ]
    wsAbs.getRow(1).font = { bold: true }
    for (const r of absRequests) {
      wsAbs.addRow({
        name: r.profiles?.full_name ?? '—',
        start: r.start_date,
        end: r.end_date,
        type: BENEFIT_LABELS[r.benefit_type] ?? r.benefit_type,
        area: r.profiles?.areas?.name ?? '—',
      })
    }

    // Sheet 2: Overtime
    const wsOvt = wb.addWorksheet('Horas Extra')
    wsOvt.columns = [
      { header: 'Empleado', key: 'name', width: 28 },
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Horas', key: 'hours', width: 10 },
      { header: 'Tipo', key: 'type', width: 14 },
    ]
    wsOvt.getRow(1).font = { bold: true }
    for (const o of overtimeRecords) {
      wsOvt.addRow({
        name: o.profiles?.full_name ?? '—',
        date: o.date,
        hours: o.hours,
        type: o.type,
      })
    }

    // Sheet 3: Balances
    const wsBal = wb.addWorksheet('Saldos')
    wsBal.columns = [
      { header: 'Empleado', key: 'name', width: 28 },
      { header: 'Área', key: 'area', width: 20 },
      { header: 'Tipo', key: 'type', width: 18 },
      { header: 'Días restantes', key: 'days', width: 16 },
    ]
    wsBal.getRow(1).font = { bold: true }
    for (const b of balances) {
      const row = wsBal.addRow({
        name: b.profiles?.full_name ?? '—',
        area: b.profiles?.areas?.name ?? '—',
        type: BENEFIT_LABELS[b.benefit_type] ?? b.benefit_type,
        days: b.remaining_days,
      })
      if (b.remaining_days < 3) {
        row.getCell('days').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-hr-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Archivo XLS exportado correctamente')
  } catch (err) {
    console.error(err)
    toast.error('Error al exportar XLS')
  }
}

async function exportPDF(
  absRequests: Request[],
  overtimeRecords: OvertimeRecord[]
) {
  try {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text('Reporte HR — BYD Simone', 14, 18)
    doc.setFontSize(10)
    doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 26)

    // Absences table
    doc.setFontSize(12)
    doc.text('Ausentismo', 14, 38)
    autoTable(doc, {
      startY: 42,
      head: [['Empleado', 'Fecha inicio', 'Fecha fin', 'Tipo', 'Área']],
      body: absRequests.map((r) => [
        r.profiles?.full_name ?? '—',
        r.start_date,
        r.end_date,
        BENEFIT_LABELS[r.benefit_type] ?? r.benefit_type,
        r.profiles?.areas?.name ?? '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    })

    const finalY = (doc as any).lastAutoTable?.finalY ?? 80
    doc.setFontSize(12)
    doc.text('Horas Extra', 14, finalY + 12)
    autoTable(doc, {
      startY: finalY + 16,
      head: [['Empleado', 'Fecha', 'Horas', 'Tipo']],
      body: overtimeRecords.map((o) => [
        o.profiles?.full_name ?? '—',
        o.date,
        String(o.hours),
        o.type,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [30, 64, 175] },
    })

    doc.save(`reporte-hr-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
    toast.success('Archivo PDF exportado correctamente')
  } catch (err) {
    console.error(err)
    toast.error('Error al exportar PDF')
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

type Tab = 'ausentismo' | 'horas_extras' | 'saldos' | 'resumen'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'ausentismo',   label: 'Ausentismo',   icon: <CalendarDays size={15} /> },
  { key: 'horas_extras', label: 'Horas Extras',  icon: <Clock size={15} /> },
  { key: 'saldos',       label: 'Saldos',         icon: <AlertTriangle size={15} /> },
  { key: 'resumen',      label: 'Resumen',         icon: <ListChecks size={15} /> },
]

export default function ReportsClientPage({
  absRequests,
  overtimeRecords,
  balances,
  pendingRequests,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('resumen')
  const [exporting, setExporting] = useState<'xls' | 'pdf' | null>(null)

  async function handleExportXLS() {
    setExporting('xls')
    await exportXLS(absRequests, overtimeRecords, balances)
    setExporting(null)
  }

  async function handleExportPDF() {
    setExporting('pdf')
    await exportPDF(absRequests, overtimeRecords)
    setExporting(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes HR</h1>
            <p className="text-sm text-gray-500 mt-0.5">Análisis de ausentismo, horas extras y saldos</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportXLS}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              <Download size={14} />
              {exporting === 'xls' ? 'Exportando...' : 'Exportar XLS'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting !== null}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              <Download size={14} />
              {exporting === 'pdf' ? 'Exportando...' : 'Exportar PDF'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 mb-6 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                activeTab === t.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {activeTab === 'ausentismo' && <AbsenteeismTab requests={absRequests} />}
          {activeTab === 'horas_extras' && <OvertimeTab records={overtimeRecords} />}
          {activeTab === 'saldos' && <BalancesTab balances={balances} />}
          {activeTab === 'resumen' && (
            <SummaryTab
              pendingRequests={pendingRequests}
              overtimeRecords={overtimeRecords}
              balances={balances}
            />
          )}
        </div>
      </div>
    </div>
  )
}
