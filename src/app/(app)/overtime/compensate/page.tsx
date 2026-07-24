'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, AlertCircle, Clock, Loader2, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/dates';
import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORK_HOURS_PER_DAY = 8;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function hoursToEquivalentDays(hours: number): string {
  const days = hours / WORK_HOURS_PER_DAY;
  if (days < 1) {
    return `${hours.toFixed(1).replace('.', ',')} hs (menos de 1 día)`;
  }
  const whole = Math.floor(days);
  const remainder = hours - whole * WORK_HOURS_PER_DAY;
  if (remainder === 0) {
    return `${whole} día${whole !== 1 ? 's' : ''} completo${whole !== 1 ? 's' : ''}`;
  }
  return `${whole} día${whole !== 1 ? 's' : ''} y ${remainder.toFixed(1).replace('.', ',')} hs`;
}

// ---------------------------------------------------------------------------
// Zod schema (dynamic max validated at submit time against availableHours)
// ---------------------------------------------------------------------------

function buildSchema(availableHours: number) {
  return z
    .object({
      start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
      end_date: z.string().min(1, 'La fecha de fin es obligatoria'),
      hours_requested: z
        .number({ invalid_type_error: 'Ingresá un número válido' })
        .min(0.5, 'El mínimo es 0,5 horas')
        .max(
          availableHours > 0 ? availableHours : 0.5,
          `No podés solicitar más horas de las disponibles (${availableHours.toFixed(1).replace('.', ',')} hs)`,
        ),
      reason: z.string().optional(),
    })
    .refine((data) => data.end_date >= data.start_date, {
      message: 'La fecha de fin debe ser igual o posterior a la de inicio',
      path: ['end_date'],
    });
}

type FormValues = {
  start_date: string;
  end_date: string;
  hours_requested: number;
  reason?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OvertimeCompensatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [availableHours, setAvailableHours] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Build schema dynamically once availableHours is known
  const schema = useMemo(
    () => buildSchema(availableHours ?? 0),
    [availableHours],
  );

  const today = todayISO();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      start_date: today,
      end_date: today,
      hours_requested: 0,
      reason: '',
    },
  });

  const startDate = watch('start_date');
  const hoursRequested = watch('hours_requested');

  // Keep end_date >= start_date when start_date changes
  const endDate = watch('end_date');
  useEffect(() => {
    if (endDate && endDate < startDate) {
      setValue('end_date', startDate);
    }
  }, [startDate, endDate, setValue]);

  // -------------------------------------------------------------------------
  // Fetch overtime balance
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function fetchBalance() {
      setLoadingBalance(true);
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('No autenticado');

        const { data, error } = await supabase
          .from('overtime_balance')
          .select('available_hours')
          .eq('employee_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setAvailableHours(data?.available_hours ?? 0);
      } catch {
        toast.error('No se pudo cargar el saldo de horas extra');
        setAvailableHours(0);
      } finally {
        setLoadingBalance(false);
      }
    }
    fetchBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------
  async function onSubmit(values: FormValues) {
    if (availableHours === 0) {
      toast.error('No tenés horas extra disponibles para compensar');
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('No autenticado');

      const { error } = await supabase.from('overtime_compensations').insert({
        employee_id: user.id,
        start_date: values.start_date,
        end_date: values.end_date,
        hours_requested: values.hours_requested,
        reason: values.reason || null,
      });

      if (error) throw error;

      toast.success('Solicitud de compensación enviada correctamente');
      router.push('/overtime');
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : 'Error al enviar la solicitud',
      );
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived UI
  // -------------------------------------------------------------------------
  const hoursEquivalent =
    typeof hoursRequested === 'number' && hoursRequested > 0
      ? hoursToEquivalentDays(hoursRequested)
      : null;

  const noBalance = availableHours !== null && availableHours === 0;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
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
            Solicitar compensación
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Usá tus horas extra acumuladas para tomar tiempo libre
          </p>
        </div>
      </div>

      {/* Balance card */}
      <div
        className={cn(
          'mb-6 flex items-center gap-4 rounded-xl border p-5 shadow-sm',
          loadingBalance
            ? 'border-gray-200 bg-gray-50'
            : noBalance
              ? 'border-red-200 bg-red-50'
              : 'border-emerald-200 bg-emerald-50',
        )}
      >
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            loadingBalance
              ? 'bg-gray-200'
              : noBalance
                ? 'bg-red-100'
                : 'bg-emerald-100',
          )}
        >
          {loadingBalance ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : (
            <Clock
              className={cn(
                'h-5 w-5',
                noBalance ? 'text-red-500' : 'text-emerald-600',
              )}
            />
          )}
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Horas disponibles
          </p>
          {loadingBalance ? (
            <div className="mt-1 h-7 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <p
              className={cn(
                'text-2xl font-bold',
                noBalance ? 'text-red-700' : 'text-emerald-700',
              )}
            >
              {(availableHours ?? 0).toFixed(1).replace('.', ',')} hs
            </p>
          )}
          {!loadingBalance && !noBalance && availableHours !== null && (
            <p className="mt-0.5 text-xs text-emerald-600">
              Equivale a aprox. {hoursToEquivalentDays(availableHours)}
            </p>
          )}
        </div>
      </div>

      {/* Zero-balance warning */}
      {noBalance && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No tenés horas extra disponibles. Registrá horas extra primero antes
            de solicitar compensación.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-800">
            Período de compensación
          </h2>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-4">
            {/* start_date */}
            <div>
              <label
                htmlFor="start_date"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Fecha inicio <span className="text-red-500">*</span>
              </label>
              <input
                id="start_date"
                type="date"
                min={today}
                {...register('start_date')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.start_date
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white',
                )}
              />
              {errors.start_date && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.start_date.message}
                </p>
              )}
              {startDate && (
                <p className="mt-1 text-xs text-gray-400">
                  {formatDate(startDate)}
                </p>
              )}
            </div>

            {/* end_date */}
            <div>
              <label
                htmlFor="end_date"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Fecha fin <span className="text-red-500">*</span>
              </label>
              <input
                id="end_date"
                type="date"
                min={startDate || today}
                {...register('end_date')}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.end_date
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white',
                )}
              />
              {errors.end_date && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.end_date.message}
                </p>
              )}
            </div>
          </div>

          {/* hours_requested */}
          <div className="mt-4">
            <label
              htmlFor="hours_requested"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Horas a compensar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="hours_requested"
                type="number"
                step="0.5"
                min="0.5"
                max={availableHours ?? undefined}
                placeholder="0.0"
                {...register('hours_requested', { valueAsNumber: true })}
                disabled={noBalance || loadingBalance}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60',
                  errors.hours_requested
                    ? 'border-red-400 bg-red-50'
                    : 'border-gray-300 bg-white',
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                hs
              </span>
            </div>
            {errors.hours_requested && (
              <p className="mt-1 text-xs text-red-600">
                {errors.hours_requested.message}
              </p>
            )}
            {/* Equivalent helper */}
            {hoursEquivalent && !errors.hours_requested && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600">
                <Info className="h-3.5 w-3.5" />
                <span>Equivale a {hoursEquivalent}</span>
              </div>
            )}
            {!loadingBalance && availableHours !== null && availableHours > 0 && (
              <p className="mt-1 text-xs text-gray-400">
                Máximo:{' '}
                {availableHours.toFixed(1).replace('.', ',')} hs disponibles
              </p>
            )}
          </div>

          {/* reason */}
          <div className="mt-4">
            <label
              htmlFor="reason"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Motivo{' '}
              <span className="text-xs font-normal text-gray-400">
                (opcional)
              </span>
            </label>
            <textarea
              id="reason"
              rows={3}
              placeholder="Describí brevemente el motivo de la compensación…"
              {...register('reason')}
              disabled={noBalance}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </section>

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
            disabled={submitting || noBalance || loadingBalance}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Enviando…' : 'Solicitar compensación'}
          </button>
        </div>
      </form>
    </div>
  );
}
