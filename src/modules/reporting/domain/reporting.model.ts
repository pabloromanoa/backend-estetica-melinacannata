import { AppointmentStatus, DepositOutcome } from '../../scheduling/domain/appointment-status';
import { DepositStatus } from '../../scheduling/domain/deposit';

/** Fila plana de turno para estadísticas (sin datos personales innecesarios). */
export interface ReportAppointment {
  id: string;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  clientId: string;
  clientName: string;
  price: number;
  depositOutcome: DepositOutcome | null;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
}

export interface ReportDeposit {
  status: DepositStatus;
  amount: number;
  providerId: string;
  uploadedAt: Date;
  reviewedAt: Date | null;
}

export interface ReportRecommendation {
  optionName: string;
  type: 'SERVICE' | 'TREATMENT';
  confidence: number;
  outcome: 'PENDING' | 'ACCEPTED' | 'DISCARDED';
  ledToBooking: boolean;
}

export interface Period {
  from: Date;
  to: Date;
}

/** Puerto de lectura de datos agregables (módulo de sólo lectura). */
export abstract class ReportingDataSource {
  abstract appointmentsStartingIn(period: Period): Promise<ReportAppointment[]>;
  abstract appointmentsCancelledIn(period: Period): Promise<ReportAppointment[]>;
  abstract depositsUploadedOrReviewedIn(period: Period): Promise<ReportDeposit[]>;
  abstract pendingDepositsCount(): Promise<number>;
  abstract recommendationsIn(period: Period): Promise<ReportRecommendation[]>;
}

/** Estructura genérica de informe: la usan la API (JSON) y el generador de PDF. */
export interface ReportResult {
  type: ReportType;
  title: string;
  from: string;
  to: string;
  generatedAt: Date;
  summary: { label: string; value: string | number }[];
  tables: { title: string; columns: string[]; rows: (string | number)[][] }[];
}

export const REPORT_TYPES = [
  'appointments',
  'services',
  'providers',
  'cancellations',
  'agenda-efficiency',
  'recommendations',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export abstract class ReportPdfRenderer {
  abstract render(report: ReportResult): Promise<Buffer>;
}

const PERFORMED_STATUSES: readonly AppointmentStatus[] = [
  AppointmentStatus.FINISHED,
  AppointmentStatus.DEPOSIT_PAID,
];

/**
 * Un servicio cuenta como "prestado" si se marcó FINALIZADO o si estaba SEÑADO y su horario ya pasó
 * (el personal puede no marcar "finalizar" en cada turno).
 */
export function isPerformed(a: Pick<ReportAppointment, 'status' | 'endAt'>, now: Date): boolean {
  if (a.status === AppointmentStatus.FINISHED) return true;
  return PERFORMED_STATUSES.includes(a.status) && a.endAt.getTime() <= now.getTime();
}

export function within(date: Date | null, period: Period): boolean {
  return !!date && date.getTime() >= period.from.getTime() && date.getTime() < period.to.getTime();
}

export const sum = (values: number[]): number =>
  Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
