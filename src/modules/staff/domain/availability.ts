import { InvalidInputError } from '../../../shared/domain/domain-error';
import { BusinessTime } from '../../../shared/domain/business-time';
import { Interval, overlaps, parseTime } from '../../../shared/domain/interval';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Franja del horario semanal habitual. Varias por día permiten cortes (ej. almuerzo). */
export interface WeeklyAvailabilityRange {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
}

export enum ExceptionType {
  /** No disponible: todo el día (sin horas) o sólo en el rango indicado. */
  UNAVAILABLE = 'UNAVAILABLE',
  /** Disponible excepcionalmente en el rango indicado (reemplaza el horario habitual del día). */
  AVAILABLE = 'AVAILABLE',
}

export interface AvailabilityException {
  id: string;
  providerId: string;
  date: string;
  type: ExceptionType;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
}

function toInterval(startTime: string, endTime: string): Interval {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (end <= start) {
    throw new InvalidInputError(
      `La hora de fin (${endTime}) debe ser posterior a la de inicio (${startTime})`,
    );
  }
  return { start, end };
}

/** Valida que las franjas sean coherentes y no se superpongan dentro del mismo día. */
export function validateWeeklyRanges(ranges: readonly WeeklyAvailabilityRange[]): void {
  const byDay = new Map<number, Interval[]>();
  for (const range of ranges) {
    if (!Number.isInteger(range.dayOfWeek) || range.dayOfWeek < 0 || range.dayOfWeek > 6) {
      throw new InvalidInputError(`Día de la semana inválido: ${range.dayOfWeek}`);
    }
    const current = toInterval(range.startTime, range.endTime);
    const sameDay = byDay.get(range.dayOfWeek) ?? [];
    if (sameDay.some((other) => overlaps(other, current))) {
      throw new InvalidInputError('Hay franjas superpuestas en el mismo día', range);
    }
    byDay.set(range.dayOfWeek, [...sameDay, current]);
  }
}

export function validateException(input: Omit<AvailabilityException, 'id' | 'providerId'>): void {
  BusinessTime.assertDate(input.date);
  const hasStart = input.startTime !== null;
  const hasEnd = input.endTime !== null;
  if (hasStart !== hasEnd) {
    throw new InvalidInputError('Indicá hora de inicio y de fin, o ninguna para todo el día');
  }
  if (input.type === ExceptionType.AVAILABLE && !hasStart) {
    throw new InvalidInputError('Una disponibilidad excepcional requiere un rango horario');
  }
  if (hasStart) toInterval(input.startTime!, input.endTime!);
}

export function weeklyRangeToInterval(range: WeeklyAvailabilityRange): Interval {
  return toInterval(range.startTime, range.endTime);
}

export function exceptionToInterval(exception: AvailabilityException): Interval | null {
  if (exception.startTime === null || exception.endTime === null) return null;
  return toInterval(exception.startTime, exception.endTime);
}
