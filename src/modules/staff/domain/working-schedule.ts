import { BusinessTime } from '../../../shared/domain/business-time';
import { Interval, mergeIntervals, subtractIntervals } from '../../../shared/domain/interval';
import {
  AvailabilityException,
  exceptionToInterval,
  ExceptionType,
  WeeklyAvailabilityRange,
  weeklyRangeToInterval,
} from './availability';

/**
 * Calcula los intervalos laborables de un prestador en una fecha:
 * 1. parte del horario semanal habitual del día;
 * 2. si hay excepciones AVAILABLE para la fecha, éstas reemplazan al horario habitual;
 * 3. una excepción UNAVAILABLE sin horas anula el día completo;
 * 4. las UNAVAILABLE con rango se descuentan.
 */
export function resolveWorkingIntervals(
  date: string,
  weekly: readonly WeeklyAvailabilityRange[],
  exceptions: readonly AvailabilityException[],
): Interval[] {
  const dayOfWeek = BusinessTime.dayOfWeek(date);
  const ofDate = exceptions.filter((e) => e.date === date);

  if (ofDate.some((e) => e.type === ExceptionType.UNAVAILABLE && exceptionToInterval(e) === null)) {
    return [];
  }

  const extraordinary = ofDate
    .filter((e) => e.type === ExceptionType.AVAILABLE)
    .map(exceptionToInterval)
    .filter((i): i is Interval => i !== null);

  const base =
    extraordinary.length > 0
      ? extraordinary
      : weekly.filter((r) => r.dayOfWeek === dayOfWeek).map(weeklyRangeToInterval);

  const blocked = ofDate
    .filter((e) => e.type === ExceptionType.UNAVAILABLE)
    .map(exceptionToInterval)
    .filter((i): i is Interval => i !== null);

  return subtractIntervals(mergeIntervals(base), blocked);
}
