import {
  AppointmentStatus,
  CancelledBy,
  DepositOutcome,
  OCCUPYING_STATUSES,
} from './appointment-status';
import { resolveDepositOutcome } from './cancellation-policy';
import {
  HoldExpiredError,
  InvalidStatusTransitionError,
  ReasonRequiredError,
} from './scheduling.errors';

export interface AppointmentProps {
  id: string;
  code: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  /** Inicio y fin de la atención (lo que ve el cliente). */
  startAt: Date;
  endAt: Date;
  /** Rango que bloquea la agenda: incluye preparación previa y limpieza posterior. */
  blockedFrom: Date;
  blockedUntil: Date;
  status: AppointmentStatus;
  holdExpiresAt: Date | null;
  price: number;
  depositAmount: number;
  guestTokenHash: string | null;
  createdByStaff: boolean;
  rescheduled: boolean;
  rescheduleReason: string | null;
  cancellationReason: string | null;
  cancelledBy: CancelledBy | null;
  depositOutcome: DepositOutcome | null;
  cancelledAt: Date | null;
  recommendationId: string | null;
  reminderSentAt: Date | null;
  createdAt: Date;
}

export interface NewAppointment {
  id: string;
  code: string;
  clientId: string;
  providerId: string;
  serviceId: string;
  startAt: Date;
  durationMinutes: number;
  prepMinutes: number;
  cleanupMinutes: number;
  price: number;
  depositAmount: number;
  guestTokenHash: string | null;
  createdByStaff: boolean;
  recommendationId: string | null;
  holdMinutes: number;
  now: Date;
}

export interface NewSchedule {
  providerId: string;
  startAt: Date;
  durationMinutes: number;
  prepMinutes: number;
  cleanupMinutes: number;
}

const addMinutes = (date: Date, minutes: number) => new Date(date.getTime() + minutes * 60_000);

/**
 * Agregado Turno. Encapsula la máquina de estados del relevamiento:
 * CREATED → PAYMENT_INFORMED → DEPOSIT_PAID → FINISHED, con salidas a EXPIRED y CANCELLED.
 * Ninguna capa externa modifica el estado directamente: siempre a través de estos métodos.
 */
export class Appointment {
  private constructor(private props: AppointmentProps) {}

  static create(input: NewAppointment): Appointment {
    return new Appointment({
      id: input.id,
      code: input.code,
      clientId: input.clientId,
      providerId: input.providerId,
      serviceId: input.serviceId,
      ...Appointment.timesFor(input),
      status: AppointmentStatus.CREATED,
      holdExpiresAt: addMinutes(input.now, input.holdMinutes),
      price: input.price,
      depositAmount: input.depositAmount,
      guestTokenHash: input.guestTokenHash,
      createdByStaff: input.createdByStaff,
      rescheduled: false,
      rescheduleReason: null,
      cancellationReason: null,
      cancelledBy: null,
      depositOutcome: null,
      cancelledAt: null,
      recommendationId: input.recommendationId,
      reminderSentAt: null,
      createdAt: input.now,
    });
  }

  static restore(props: AppointmentProps): Appointment {
    return new Appointment({ ...props });
  }

  private static timesFor(s: Omit<NewSchedule, 'providerId'>) {
    const endAt = addMinutes(s.startAt, s.durationMinutes);
    return {
      startAt: s.startAt,
      endAt,
      blockedFrom: addMinutes(s.startAt, -s.prepMinutes),
      blockedUntil: addMinutes(endAt, s.cleanupMinutes),
    };
  }

  get id(): string {
    return this.props.id;
  }
  get status(): AppointmentStatus {
    return this.props.status;
  }
  get providerId(): string {
    return this.props.providerId;
  }
  get clientId(): string {
    return this.props.clientId;
  }
  get startAt(): Date {
    return this.props.startAt;
  }
  get depositAmount(): number {
    return this.props.depositAmount;
  }
  get guestTokenHash(): string | null {
    return this.props.guestTokenHash;
  }

  snapshot(): Readonly<AppointmentProps> {
    return { ...this.props };
  }

  isHoldExpired(now: Date): boolean {
    return (
      this.props.status === AppointmentStatus.CREATED &&
      this.props.holdExpiresAt !== null &&
      this.props.holdExpiresAt.getTime() <= now.getTime()
    );
  }

  /** ¿Ocupa la agenda en este momento? */
  isOccupying(now: Date): boolean {
    return OCCUPYING_STATUSES.includes(this.props.status) && !this.isHoldExpired(now);
  }

  /** El cliente adjuntó el comprobante dentro del plazo. */
  informPayment(now: Date): void {
    this.assertStatus('informar el pago de', [AppointmentStatus.CREATED]);
    if (this.isHoldExpired(now)) throw new HoldExpiredError();
    this.props.status = AppointmentStatus.PAYMENT_INFORMED;
    // Con comprobante adjunto, el turno deja de vencer automáticamente.
    this.props.holdExpiresAt = null;
  }

  confirmDeposit(): void {
    this.assertStatus('confirmar la seña de', [AppointmentStatus.PAYMENT_INFORMED]);
    this.props.status = AppointmentStatus.DEPOSIT_PAID;
  }

  /** Seña rechazada: el turno expira y el horario se libera (no puede reutilizarse). */
  rejectDeposit(): void {
    this.assertStatus('rechazar la seña de', [AppointmentStatus.PAYMENT_INFORMED]);
    this.props.status = AppointmentStatus.EXPIRED;
  }

  /** Devuelve `true` si el bloqueo venció y el turno pasó a EXPIRED. */
  expireIfHoldElapsed(now: Date): boolean {
    if (!this.isHoldExpired(now)) return false;
    this.props.status = AppointmentStatus.EXPIRED;
    return true;
  }

  cancel(input: {
    by: CancelledBy;
    reason: string | null;
    now: Date;
    refundWindowHours: number;
  }): DepositOutcome {
    this.assertStatus('cancelar', [
      AppointmentStatus.CREATED,
      AppointmentStatus.PAYMENT_INFORMED,
      AppointmentStatus.DEPOSIT_PAID,
    ]);
    const reason = input.reason?.trim() || null;
    if (input.by !== CancelledBy.CLIENT && !reason) throw new ReasonRequiredError('cancelar');

    const outcome = resolveDepositOutcome({
      status: this.props.status,
      startAt: this.props.startAt,
      now: input.now,
      cancelledBy: input.by,
      refundWindowHours: input.refundWindowHours,
    });
    Object.assign(this.props, {
      status: AppointmentStatus.CANCELLED,
      cancelledBy: input.by,
      cancellationReason: reason,
      depositOutcome: outcome,
      cancelledAt: input.now,
      holdExpiresAt: null,
    });
    return outcome;
  }

  /** La reprogramación no es un estado: el turno conserva su estado y se marca como reprogramado. */
  reschedule(schedule: NewSchedule, reason: string): void {
    this.assertStatus('reprogramar', [
      AppointmentStatus.PAYMENT_INFORMED,
      AppointmentStatus.DEPOSIT_PAID,
    ]);
    if (!reason.trim()) throw new ReasonRequiredError('reprogramar');
    Object.assign(this.props, {
      ...Appointment.timesFor(schedule),
      providerId: schedule.providerId,
      rescheduled: true,
      rescheduleReason: reason.trim(),
      reminderSentAt: null,
    });
  }

  finish(): void {
    this.assertStatus('finalizar', [AppointmentStatus.DEPOSIT_PAID]);
    this.props.status = AppointmentStatus.FINISHED;
  }

  markReminderSent(now: Date): void {
    this.props.reminderSentAt = now;
  }

  private assertStatus(action: string, allowed: readonly AppointmentStatus[]): void {
    if (!allowed.includes(this.props.status)) {
      throw new InvalidStatusTransitionError(action, this.props.status);
    }
  }
}
