/**
 * Intervalo semiabierto [start, end) expresado en minutos desde la medianoche local.
 * Es el bloque básico de todo el motor de disponibilidad: funciones puras, sin I/O.
 */
export interface Interval {
  readonly start: number;
  readonly end: number;
}

export const MINUTES_PER_DAY = 24 * 60;

export function interval(start: number, end: number): Interval {
  if (end < start) {
    throw new RangeError(`Intervalo inválido: ${start} > ${end}`);
  }
  return { start, end };
}

export function lengthOf(i: Interval): number {
  return i.end - i.start;
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function contains(outer: Interval, inner: Interval): boolean {
  return outer.start <= inner.start && inner.end <= outer.end;
}

/** Ordena y fusiona intervalos que se solapan o se tocan. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) {
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, current.end) };
    } else {
      merged.push({ ...current });
    }
  }
  return merged;
}

/** Devuelve las partes de `base` que no quedan cubiertas por `toRemove`. */
export function subtractIntervals(
  base: readonly Interval[],
  toRemove: readonly Interval[],
): Interval[] {
  const removals = mergeIntervals(toRemove);
  const result: Interval[] = [];
  for (const segment of mergeIntervals(base)) {
    let cursor = segment.start;
    for (const removal of removals) {
      if (removal.end <= cursor || removal.start >= segment.end) continue;
      if (removal.start > cursor) result.push({ start: cursor, end: removal.start });
      cursor = Math.max(cursor, removal.end);
      if (cursor >= segment.end) break;
    }
    if (cursor < segment.end) result.push({ start: cursor, end: segment.end });
  }
  return result;
}

export function totalMinutes(intervals: readonly Interval[]): number {
  return mergeIntervals(intervals).reduce((sum, i) => sum + lengthOf(i), 0);
}

/** "HH:mm" → minutos. */
export function parseTime(hhmm: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) {
    if (hhmm === '24:00') return MINUTES_PER_DAY;
    throw new RangeError(`Hora inválida: ${hhmm}`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** minutos → "HH:mm". */
export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Partes comunes entre dos conjuntos de intervalos. */
export function intersectIntervals(a: readonly Interval[], b: readonly Interval[]): Interval[] {
  return subtractIntervals(a, subtractIntervals(a, b));
}
