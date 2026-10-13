import { Appointment } from './appointment';
import { AppointmentStatus } from './appointment-status';
import { Deposit, DepositStatus } from './deposit';

export interface OccupancyQuery {
  providerIds: readonly string[];
  /** Ventana (UTC) que debe solaparse con el rango bloqueado del turno. */
  from: Date;
  to: Date;
  now: Date;
  excludeAppointmentId?: string;
}

export interface BlockedRange {
  appointmentId: string;
  providerId: string;
  blockedFrom: Date;
  blockedUntil: Date;
}

export abstract class AppointmentRepository {
  abstract findById(id: string): Promise<Appointment | null>;
  abstract findByGuestTokenHash(hash: string): Promise<Appointment | null>;
  abstract save(appointment: Appointment): Promise<void>;
  /** Rangos que ocupan la agenda: estados que ocupan y CREATED con bloqueo vigente. */
  abstract findBlockedRanges(query: OccupancyQuery): Promise<BlockedRange[]>;
  abstract findWithElapsedHold(now: Date, limit: number): Promise<Appointment[]>;
  /** Turnos señados que empiezan dentro de la ventana y todavía no recibieron recordatorio. */
  abstract findDueForReminder(from: Date, to: Date, minLeadHours: number): Promise<Appointment[]>;
  abstract codeExists(code: string): Promise<boolean>;
}

export abstract class DepositRepository {
  abstract findById(id: string): Promise<Deposit | null>;
  abstract findLatestByAppointment(appointmentId: string): Promise<Deposit | null>;
  abstract save(deposit: Deposit): Promise<void>;
}

/** Almacenamiento PRIVADO de comprobantes (fuera de cualquier directorio público). */
export abstract class ReceiptStorage {
  /** Guarda el contenido con un nombre interno aleatorio y devuelve esa clave. */
  abstract save(content: Buffer): Promise<string>;
  abstract read(key: string): Promise<Buffer>;
  abstract remove(key: string): Promise<void>;
}

/** Genera códigos legibles de turno (ej. "TRN-8K4Q2M"). */
export abstract class AppointmentCodeGenerator {
  abstract next(): string;
}

export abstract class RandomPicker {
  abstract pick<T>(items: readonly T[]): T;
}

/** Tokens del enlace privado de invitados: sólo se persiste el hash. */
export abstract class GuestTokenService {
  abstract generate(): { token: string; hash: string };
  abstract hash(token: string): string;
}

export interface DepositInboxFilter {
  status: DepositStatus;
  providerId?: string;
}

export interface AppointmentListFilter {
  from: Date;
  to: Date;
  providerIds?: string[];
  statuses?: AppointmentStatus[];
  clientId?: string;
  search?: string;
}
