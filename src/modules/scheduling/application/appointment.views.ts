import { AppointmentStatus, CancelledBy, DepositOutcome } from '../domain/appointment-status';
import { DepositStatus } from '../domain/deposit';

export interface ProviderSummaryView {
  id: string;
  displayName: string;
  specialty: string | null;
  avatarUrl: string | null;
}

export interface BankDetailsView {
  alias: string | null;
  cbu: string | null;
  holder: string | null;
  cuil: string | null;
  bankName: string | null;
}

export interface ClientSummaryView {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string | null;
  hasAccount: boolean;
}

export interface DepositView {
  id: string;
  appointmentId: string;
  amount: number;
  status: DepositStatus;
  uploadedAt: Date;
  reviewedAt: Date | null;
  rejectionReason: string | null;
}

/** Representación de un turno para la API (modelo de lectura, ver contrato). */
export interface AppointmentView {
  id: string;
  code: string;
  status: AppointmentStatus;
  startAt: Date;
  endAt: Date;
  holdExpiresAt: Date | null;
  price: number;
  depositAmount: number;
  remainingAmount: number;
  service: { id: string; name: string; durationMinutes: number };
  provider: ProviderSummaryView & { bankDetails: BankDetailsView };
  client: ClientSummaryView;
  deposit: DepositView | null;
  rescheduled: boolean;
  rescheduleReason: string | null;
  cancellationReason: string | null;
  cancelledBy: CancelledBy | null;
  depositOutcome: DepositOutcome | null;
  createdAt: Date;
}

export interface DepositInboxItem extends DepositView {
  appointment: AppointmentView;
}
