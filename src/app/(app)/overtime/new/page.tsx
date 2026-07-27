'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, Clock, AlertTriangle, Info, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/dates';
import { createClient } from '@/lib/supabase/client';
import { useAppContext } from '@/lib/context/AppContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Leader {
  id: string;
  full_name: string;
  role: string;
}

interface OvertimeBreakdown {
  hours_50pct: number;
  hours_100pct: number;
  night_hours: number;
}

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const schema = z
  .object({
    work_date: z.string().min(1, 'La fecha es obligatoria'),
    start_time: z
      .string()
      .min(1, 'La hora de inicio es obligatoria')
      .regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    end_time: z
      .string()
      .min(1, 'La hora de fin es obligatoria')
      .regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
    authorized_by: z.string().min(1, 'Seleccioná un autorizante'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.start_time || !data.end_time) return true;
      return data.end_time !== data.start_time;
    },
    { message: 'La hora de fin debe ser distinta a la de inicio', path: ['end_time'] },
  );

type FormValues = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Elapsed hours between two HH:MM strings. Allows overnight shifts. */
function diffHours(start: string, end: string): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return null;
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60; // overnight
  return (endMins - startMins) / 60;
}

function getDayOfWeek(dateStr: string): number | null {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').getDay(); // 0=Sun, 6=Sat
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewOvertimePage() {
  const router = useRouter();
  const supabase = createClient();
  const { userId } = useAppContext();

  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(true);

  const [breakdown, setBreakdown] = useState<OvertimeBreakdown | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      work_date: todayISO(),
      start_time: '',
      end_time: '',
      authorized_by: '',
      notes: '',
    },
  });

  const workDate = watch('work_date');
  const startTime = watch('start_time');
  const endTime = watch('end_time');

  // -------------------------------------------------------------------------
  // Fetch leaders
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function fetchLeaders() {
      setLoadingLeaders(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('role', ['leader', 'manager', 'hr_admin'])
        .is('deleted_at', null)
        .order('full_name');

      if (error) {
        toast.error('No se pudieron cargar los autorizantes');
      } else {
        setLeaders(data ?? []);
      }
      setLoadingLeaders(false);
    }
    fetchLeaders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Live breakdown preview (debounced 600 ms)
  // -------------------------------------------------------------------------
  const fetchBreakdown = useCallback(
    async (date: string, start: string, end: string) => {
      setLoadingBreakdown(true);
      setBreakdown(null);
      try {
        const { data, error } = await supabase.rpc(
          'calculate_overtime_breakdown',
          {
            p_date: date,
            p_start: start + ':00',
            p_end: end + ':00',
          },
        );
        if (error) throw error;
        setBreakdown(data as OvertimeBreakdown);
      } catch {
        toast.error('No se pudo calcular el desglose de horas');
      } finally {
        setLoadingBreakdown(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!workDate || !startTime || !endTime) {
      setBreakdown(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchBreakdown(workDate, startTime, endTime);
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [workDate, startTime, endTime, fetchBreakdown]);

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('overtime_records').insert({
        employee_id: userId,
        work_date: values.work_date,
        start_time: values.start_time + ':00',
        end_time: values.end_time + ':00',
        authorized_by: values.authorized_by,
        notes: values.notes || null,
        status: 'pending_validation',
      });

      if (error) throw error;

      toast.success('Horas extra registradas correctamente');
      router.push('/overtime');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Error al guardar el registro',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived UI values
  // -------------------------------------------------------------------------
  const totalHours = diffHours(startTime, endTime);
  const exceedsDaily = totalHours !== null && totalHours > 3;
  const dayOfWeek = getDayOfWeek(workDate);
  const dayIsSunday = dayOfWeek === 0;
  const dayIsSaturday = dayOfWeek === 6;
  const showBreakdownSection =
    loadingBreakdown || breakdown !== null || (!!workDate && !!startTime && !!endTime);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/overtime')}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Volver a horas extra"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Registrar horas extra
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Completá los datos del trabajo realizado fuera del horario habitual
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* ----------------------------------------------------------------- */}
        {/* Card: Datos del turno                                              */}
        {/* ----------------------------------------------------------------- */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Datos del turno
          </h2>

          {/* Date */}
          <div className="mb-4">
            <label
              htmlFor="work_date"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Fecha de trabajo <span className="text-red-500">*</span>
            </label>
            <input
              id="work_date"
              type="date"
              {...register('work_date')}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                errors.work_date
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white',
              )}
            />
            {errors.work_date && (
              <p className="mt-1 text-xs text-red-600">
                {errors.work_date.message}
              </p>
            )}
            {workDate && (
              <p className="mt-1 text-xs text-gray-400">
                {formatDate(workDate)}
              </p>
            )}
          </div>

          {/* Times row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {/* start_time */}
            <div>
              <label
                htmlFor="start_time"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Hora inicio <span className="text-red-500">*</span>
              </label>
              <input
                id="start_time"
                type="time"
                {...register('start_time')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.start_time
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white',
                )}
              />
              {errors.start_time && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.start_time.message}
                </p>
              )}
            </div>

            {/* end_time */}
            <div>
              <label
                htmlFor="end_time"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Hora fin <span className="text-red-500">*</span>
              </label>
              <input
                id="end_time"
                type="time"
                {...register('end_time')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.end_time
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white',
                )}
              />
              {errors.end_time && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.end_time.message}
                </p>
              )}
            </div>

            {/* Quick total display */}
            {totalHours !== null && (
              <div className="flex items-end">
                <div className="flex w-full items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                  <Clock className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700">
                    {totalHours.toFixed(2).replace('.', ',')} hs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* authorized_by */}
          <div className="mt-4">
            <label
              htmlFor="authorized_by"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Autorizado por <span className="text-red-500">*</span>
            </label>
            <select
              id="authorized_by"
              {...register('authorized_by')}
              disabled={loadingLeaders}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                errors.authorized_by
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-300 bg-white',
              )}
            >
              <option value="">
                {loadingLeaders ? 'Cargando…' : 'Seleccioná un autorizante'}
              </option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.full_name}
                </option>
              ))}
            </select>
            {errors.authorized_by && (
              <p className="mt-1 text-xs text-red-600">
                {errors.authorized_by.message}
              </p>
            )}
          </div>

          {/* notes */}
          <div className="mt-4">
            <label
              htmlFor="notes"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Notas{' '}
              <span className="text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Describí brevemente la tarea realizada…"
              {...register('notes')}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* ----------------------------------------------------------------- */}
        {/* Card: LCT Breakdown preview                                        */}
        {/* ----------------------------------------------------------------- */}
        {showBreakdownSection && (
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-gray-800">
              Desglose según LCT
            </h2>

            {/* Day-type notice */}
            {workDate && (dayIsSunday || dayIsSaturday) && (
              <div
                className={cn(
                  'mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
                  dayIsSunday
                    ? 'border-orange-200 bg-orange-50 text-orange-700'
                    : 'border-yellow-200 bg-yellow-50 text-yellow-700',
                )}
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {dayIsSunday
                    ? 'Domingo: todas las horas se liquidan al 100% según LCT (art. 204).'
                    : 'Sábado: horas hasta las 13:00 al 50%; a partir de las 13:00 al 100% (art. 204).'}
                </span>
              </div>
            )}

            {loadingBreakdown ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-sm text-gray-500">
                  Calculando desglose…
                </span>
              </div>
            ) : breakdown ? (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <BreakdownStat
                    label="Total horas"
                    value={
                      totalHours !== null
                        ? `${totalHours.toFixed(2).replace('.', ',')} hs`
                        : '—'
                    }
                    highlight="blue"
                  />
                  <BreakdownStat
                    label="Horas al 50%"
                    value={`${(breakdown.hours_50pct ?? 0).toFixed(2).replace('.', ',')} hs`}
                    highlight="green"
                  />
                  <BreakdownStat
                    label="Horas al 100%"
                    value={`${(breakdown.hours_100pct ?? 0).toFixed(2).replace('.', ',')} hs`}
                    highlight="orange"
                  />
                  <BreakdownStat
                    label="Horas nocturnas"
                    value={`${(breakdown.night_hours ?? 0).toFixed(2).replace('.', ',')} hs`}
                    highlight="purple"
                  />
                </dl>

                {/* Limit alerts — alert only, never block */}
                <div className="mt-4 space-y-2">
                  {exceedsDaily && (
                    <LimitAlert>
                      <strong>Límite diario superado:</strong> registrás más de
                      3 horas extra en el día (art. 200 LCT). El registro quedará
                      marcado como alerta para revisión.
                    </LimitAlert>
                  )}
                </div>
              </>
            ) : null}
          </section>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => router.push('/overtime')}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Guardando…' : 'Registrar horas extra'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

type Highlight = 'blue' | 'green' | 'orange' | 'purple';

const highlightClasses: Record<
  Highlight,
  { wrapper: string; label: string; value: string }
> = {
  blue: {
    wrapper: 'border-blue-200 bg-blue-50',
    label: 'text-blue-600',
    value: 'text-blue-800',
  },
  green: {
    wrapper: 'border-green-200 bg-green-50',
    label: 'text-green-600',
    value: 'text-green-800',
  },
  orange: {
    wrapper: 'border-orange-200 bg-orange-50',
    label: 'text-orange-600',
    value: 'text-orange-800',
  },
  purple: {
    wrapper: 'border-purple-200 bg-purple-50',
    label: 'text-purple-600',
    value: 'text-purple-800',
  },
};

function BreakdownStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight: Highlight;
}) {
  const cls = highlightClasses[highlight];
  return (
    <div className={cn('rounded-lg border p-3', cls.wrapper)}>
      <dt className={cn('text-xs font-medium', cls.label)}>{label}</dt>
      <dd className={cn('mt-1 text-lg font-bold', cls.value)}>{value}</dd>
    </div>
  );
}

function LimitAlert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <span>{children}</span>
    </div>
  );
}
