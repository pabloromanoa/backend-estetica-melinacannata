import { AppointmentStatus, CancelledBy, DepositOutcome } from './appointment-status';

export interface CancellationContext {
  status: AppointmentStatus;
  startAt: Date;
  now: Date;
  cancelledBy: CancelledBy;
  refundWindowHours: number;
}

const TRANSFERRED: readonly AppointmentStatus[] = [
  AppointmentStatus.PAYMENT_INFORMED,
  AppointmentStatus.DEPOSIT_PAID,
];

/**
 * Política única de cancelación (sin reglas por servicio/cliente, según relevamiento):
 * - Cliente con ≥ 24 h de anticipación → se devuelve la seña.
 * - Cliente con < 24 h → pierde la seña.
 * - Cancelación del establecimiento → se devuelve la seña.
 * - Si todavía no transfirió nada → no aplica.
 */
export function resolveDepositOutcome(ctx: CancellationContext): DepositOutcome {
  if (!TRANSFERRED.includes(ctx.status)) return DepositOutcome.NOT_APPLICABLE;
  if (ctx.cancelledBy !== CancelledBy.CLIENT) return DepositOutcome.REFUND;
  const hoursBefore = (ctx.startAt.getTime() - ctx.now.getTime()) / 3_600_000;
  return hoursBefore >= ctx.refundWindowHours ? DepositOutcome.REFUND : DepositOutcome.FORFEIT;
}
