/** Estados del turno (ver glosario en docs/api-contract.md). */
export enum AppointmentStatus {
  /** Reserva temporal: el horario queda bloqueado hasta `holdExpiresAt` esperando el comprobante. */
  CREATED = 'CREATED',
  /** Se adjuntó comprobante; espera verificación del personal ("Pago informado"). */
  PAYMENT_INFORMED = 'PAYMENT_INFORMED',
  /** Seña verificada ("Señado"). */
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
  /** Venció el bloqueo sin comprobante o se rechazó la seña. El horario se libera. */
  EXPIRED = 'EXPIRED',
}

/** Estados que ocupan la agenda (CREATED sólo mientras no venza el bloqueo). */
export const OCCUPYING_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.CREATED,
  AppointmentStatus.PAYMENT_INFORMED,
  AppointmentStatus.DEPOSIT_PAID,
  AppointmentStatus.FINISHED,
];

/** Estados "vigentes" desde el punto de vista del cliente. */
export const ACTIVE_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.CREATED,
  AppointmentStatus.PAYMENT_INFORMED,
  AppointmentStatus.DEPOSIT_PAID,
];

export enum CancelledBy {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum DepositOutcome {
  /** Corresponde devolver la seña (se gestiona fuera del sistema). */
  REFUND = 'REFUND',
  /** El cliente pierde la seña (canceló con menos de 24 h). */
  FORFEIT = 'FORFEIT',
  /** No había seña transferida. */
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}
