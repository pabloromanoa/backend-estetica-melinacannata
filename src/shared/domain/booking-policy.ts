/**
 * Reglas de reserva configurables por entorno (valores por defecto según el relevamiento):
 * seña del 50 %, bloqueo temporal de 5 min y devolución de seña si se cancela con ≥ 24 h.
 */
export class BookingPolicy {
  constructor(
    public readonly depositPercentage: number,
    public readonly holdMinutes: number,
    public readonly staffHoldMinutes: number,
    public readonly cancellationRefundHours: number,
    public readonly reminderHoursBefore: number,
  ) {}

  /** Monto de seña redondeado a 2 decimales. */
  depositFor(price: number): number {
    return Math.round(price * this.depositPercentage) / 100;
  }

  /** Minutos de bloqueo del horario mientras se espera el comprobante. */
  holdMinutesFor(createdByStaff: boolean): number {
    return createdByStaff ? this.staffHoldMinutes : this.holdMinutes;
  }
}
