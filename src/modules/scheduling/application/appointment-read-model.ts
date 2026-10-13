import { AppointmentListFilter, DepositInboxFilter } from '../domain/scheduling.ports';
import { AppointmentView, DepositInboxItem } from './appointment.views';

/** Consultas de lectura (joins) separadas del modelo de escritura (CQRS liviano). */
export abstract class AppointmentReadModel {
  abstract getById(id: string): Promise<AppointmentView | null>;
  abstract list(filter: AppointmentListFilter): Promise<AppointmentView[]>;
  abstract listByClient(clientId: string): Promise<AppointmentView[]>;
  abstract depositInbox(filter: DepositInboxFilter): Promise<DepositInboxItem[]>;
}
