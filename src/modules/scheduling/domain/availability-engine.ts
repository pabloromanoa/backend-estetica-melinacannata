import { Interval, lengthOf, subtractIntervals } from '../../../shared/domain/interval';

/**
 * MOTOR DE DISPONIBILIDAD DINÁMICA (núcleo del sistema).
 *
 * No hay grilla fija de turnos: para cada prestador se calculan los huecos libres reales
 * (jornada − turnos ocupados) y dentro de cada hueco se proponen horarios que aprovechan la
 * agenda sin dejar espacios ociosos:
 *   - desde el inicio del hueco hacia adelante, encadenando bloques;
 *   - desde el final del hueco hacia atrás, encadenando bloques;
 * se combinan, se eliminan duplicados y se ordenan.
 *
 * Un "bloque" = preparación + duración del servicio + limpieza. Todo en minutos locales
 * desde la medianoche de la fecha consultada. Funciones puras: fáciles de testear.
 */

export interface ServiceTiming {
  durationMinutes: number;
  prepMinutes: number;
  cleanupMinutes: number;
}

export interface ProviderDay {
  providerId: string;
  /** Intervalos laborables ya resueltos (horario semanal + excepciones). */
  working: readonly Interval[];
  /** Rangos ocupados por turnos existentes (incluyen su preparación y limpieza). */
  busy: readonly Interval[];
}

export interface CandidateSlot {
  providerId: string;
  /** Inicio de la atención (lo que se muestra al cliente). */
  start: number;
  /** Fin de la atención. */
  end: number;
  /** true si el bloque queda pegado a un borde del hueco: no genera tiempo ocioso. */
  contiguous: boolean;
}

export interface MergedSlot {
  start: number;
  end: number;
  providerIds: string[];
  contiguous: boolean;
}

export function blockLength(timing: ServiceTiming): number {
  return timing.prepMinutes + timing.durationMinutes + timing.cleanupMinutes;
}

/** Huecos libres reales del prestador, recortados para empezar no antes de `earliest`. */
export function freeGaps(day: Pick<ProviderDay, 'working' | 'busy'>, earliest = 0): Interval[] {
  return subtractIntervals(day.working, day.busy)
    .map((gap) => ({ start: Math.max(gap.start, earliest), end: gap.end }))
    .filter((gap) => gap.end > gap.start);
}

/** Inicios de bloque posibles dentro de un hueco (hacia adelante + hacia atrás, sin duplicados). */
export function blockStartsInGap(gap: Interval, block: number): number[] {
  if (block <= 0 || lengthOf(gap) < block) return [];
  const starts = new Set<number>();
  for (let s = gap.start; s + block <= gap.end; s += block) starts.add(s);
  for (let e = gap.end; e - block >= gap.start; e -= block) starts.add(e - block);
  return [...starts].sort((a, b) => a - b);
}

/**
 * Horarios posibles para un prestador.
 * @param earliestBlockStart minuto local a partir del cual puede empezar un bloque (p. ej. "ahora").
 */
export function generateProviderSlots(
  day: ProviderDay,
  timing: ServiceTiming,
  earliestBlockStart = 0,
): CandidateSlot[] {
  const block = blockLength(timing);
  return freeGaps(day, earliestBlockStart).flatMap((gap) =>
    blockStartsInGap(gap, block).map((blockStart) => ({
      providerId: day.providerId,
      start: blockStart + timing.prepMinutes,
      end: blockStart + timing.prepMinutes + timing.durationMinutes,
      contiguous: blockStart === gap.start || blockStart + block === gap.end,
    })),
  );
}

/** Agrupa por horario los candidatos de varios prestadores. */
export function mergeSlots(candidates: readonly CandidateSlot[]): MergedSlot[] {
  const byStart = new Map<number, MergedSlot>();
  for (const c of candidates) {
    const current = byStart.get(c.start);
    if (current) {
      if (!current.providerIds.includes(c.providerId)) current.providerIds.push(c.providerId);
      current.contiguous = current.contiguous || c.contiguous;
    } else {
      byStart.set(c.start, {
        start: c.start,
        end: c.end,
        providerIds: [c.providerId],
        contiguous: c.contiguous,
      });
    }
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

/** Calcula todos los horarios disponibles para un conjunto de prestadores. */
export function computeAvailability(
  days: readonly ProviderDay[],
  timing: ServiceTiming,
  earliestBlockStart = 0,
): MergedSlot[] {
  return mergeSlots(days.flatMap((day) => generateProviderSlots(day, timing, earliestBlockStart)));
}

/**
 * ¿Puede atenderse exactamente a las `start` (minutos)? Devuelve los prestadores que pueden.
 * Se usa para la validación final antes de confirmar (no depende del algoritmo de sugerencias:
 * acepta cualquier inicio cuyo bloque quepa en un hueco libre).
 */
export function providersAvailableAt(
  days: readonly ProviderDay[],
  timing: ServiceTiming,
  start: number,
  earliestBlockStart = 0,
): string[] {
  const blockStart = start - timing.prepMinutes;
  const blockEnd = blockStart + blockLength(timing);
  if (blockStart < earliestBlockStart) return [];
  return days
    .filter((day) => freeGaps(day).some((gap) => gap.start <= blockStart && blockEnd <= gap.end))
    .map((day) => day.providerId);
}
