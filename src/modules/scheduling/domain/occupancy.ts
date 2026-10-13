import {
  intersectIntervals,
  Interval,
  lengthOf,
  mergeIntervals,
  subtractIntervals,
  totalMinutes,
} from '../../../shared/domain/interval';

/** Hueco mínimo que se considera "aprovechable" para los indicadores de eficiencia. */
export const MIN_USEFUL_GAP_MINUTES = 15;

export interface OccupancyStats {
  capacityMinutes: number;
  bookedMinutes: number;
  freeMinutes: number;
  gaps: Interval[];
}

/**
 * Ocupación de una jornada: minutos laborables, ocupados (dentro de la jornada) y huecos libres.
 * Base de los indicadores de dashboard e informe de eficiencia de agenda.
 */
export function computeOccupancy(
  working: readonly Interval[],
  busy: readonly Interval[],
): OccupancyStats {
  const capacityMinutes = totalMinutes(working);
  const free = subtractIntervals(working, busy);
  const freeMinutes = free.reduce((sum, i) => sum + lengthOf(i), 0);
  return {
    capacityMinutes,
    bookedMinutes: capacityMinutes - freeMinutes,
    freeMinutes,
    gaps: free.filter((gap) => lengthOf(gap) >= MIN_USEFUL_GAP_MINUTES),
  };
}

/** Minutos libres que quedan ENTRE turnos (excluye el tiempo antes del primero y después del último). */
export function freeMinutesBetweenAppointments(
  working: readonly Interval[],
  busy: readonly Interval[],
): number {
  const booked = mergeIntervals(busy);
  if (booked.length < 2) return 0;
  const between: Interval = { start: booked[0].end, end: booked[booked.length - 1].start };
  const free = subtractIntervals(intersectIntervals([between], working), booked);
  return free.reduce((sum, i) => sum + lengthOf(i), 0);
}

export function percentage(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
