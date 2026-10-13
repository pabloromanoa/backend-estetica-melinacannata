import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { formatTime } from './interval';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Traduce entre "fecha local del negocio + minutos del día" y instantes UTC.
 * Toda la lógica de agenda trabaja en hora local del local (America/Argentina/Buenos_Aires)
 * y se persiste en UTC.
 */
export class BusinessTime {
  constructor(public readonly timezone: string) {}

  static assertDate(date: string): void {
    if (!DATE_PATTERN.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new RangeError(`Fecha inválida: ${date}`);
    }
  }

  /** Instante UTC correspondiente a `date` (YYYY-MM-DD) + `minutes` en hora local. */
  toInstant(date: string, minutes: number): Date {
    BusinessTime.assertDate(date);
    const dayOffset = Math.floor(minutes / (24 * 60));
    const localDate = dayOffset === 0 ? date : BusinessTime.addDays(date, dayOffset);
    return fromZonedTime(
      `${localDate}T${formatTime(minutes - dayOffset * 24 * 60)}:00`,
      this.timezone,
    );
  }

  /** Fecha local (YYYY-MM-DD) de un instante. */
  localDate(instant: Date): string {
    return formatInTimeZone(instant, this.timezone, 'yyyy-MM-dd');
  }

  /** Minutos desde la medianoche local de `date` hasta `instant` (puede ser <0 o >1440). */
  minutesFromStartOf(date: string, instant: Date): number {
    const midnight = this.toInstant(date, 0);
    return Math.round((instant.getTime() - midnight.getTime()) / 60_000);
  }

  /** 0 = domingo … 6 = sábado. */
  static dayOfWeek(date: string): number {
    BusinessTime.assertDate(date);
    return new Date(`${date}T12:00:00Z`).getUTCDay();
  }

  static addDays(date: string, days: number): string {
    const d = new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /** Lista de fechas entre `from` y `to` inclusive. */
  static datesBetween(from: string, to: string): string[] {
    const dates: string[] = [];
    for (let d = from; d <= to; d = BusinessTime.addDays(d, 1)) dates.push(d);
    return dates;
  }

  /** Lunes de la semana de `date`. */
  static startOfWeek(date: string): string {
    const dow = BusinessTime.dayOfWeek(date);
    return BusinessTime.addDays(date, dow === 0 ? -6 : 1 - dow);
  }

  static startOfMonth(date: string): string {
    return `${date.slice(0, 7)}-01`;
  }
}
