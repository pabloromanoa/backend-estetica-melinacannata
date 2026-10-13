import { Injectable } from '@nestjs/common';
import { InvalidInputError } from '../../../shared/domain/domain-error';
import { Actor, isAdmin } from '../../../shared/domain/role';
import { ClientRegistry } from '../../identity/application/client-registry.service';
import { ACTIVE_STATUSES, AppointmentStatus } from '../domain/appointment-status';
import { DepositStatus } from '../domain/deposit';
import { AppointmentLocator, AppointmentRef } from './appointment-locator.service';
import { AppointmentReadModel } from './appointment-read-model';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView, ClientSummaryView, DepositInboxItem } from './appointment.views';

export const MAX_LIST_RANGE_DAYS = 120;

export interface StaffListQuery {
  from: Date;
  to: Date;
  providerId?: string;
  statuses?: AppointmentStatus[];
  search?: string;
}

/** Lecturas de turnos respetando qué puede ver cada rol. */
@Injectable()
export class AppointmentQueries {
  constructor(
    private readonly readModel: AppointmentReadModel,
    private readonly locator: AppointmentLocator,
    private readonly views: AppointmentViews,
    private readonly clients: ClientRegistry,
  ) {}

  async get(ref: AppointmentRef): Promise<AppointmentView> {
    const appointment = await this.locator.resolve(ref);
    return this.views.get(appointment.id);
  }

  /** Listado para el personal: un prestador sólo ve su agenda. */
  list(query: StaffListQuery, actor: Actor): Promise<AppointmentView[]> {
    const days = (query.to.getTime() - query.from.getTime()) / 86_400_000;
    if (days < 0 || days > MAX_LIST_RANGE_DAYS) {
      throw new InvalidInputError(`El rango debe ser de 0 a ${MAX_LIST_RANGE_DAYS} días`);
    }
    const providerIds = isAdmin(actor)
      ? query.providerId
        ? [query.providerId]
        : undefined
      : [actor.providerId ?? '__none__'];
    return this.readModel.list({
      from: query.from,
      to: query.to,
      providerIds,
      statuses: query.statuses,
      search: query.search?.trim() || undefined,
    });
  }

  /** Portal del cliente: turnos vigentes e historial. */
  async forClient(
    clientId: string,
  ): Promise<{ active: AppointmentView[]; history: AppointmentView[] }> {
    const all = await this.readModel.listByClient(clientId);
    const isActive = (a: AppointmentView) => ACTIVE_STATUSES.includes(a.status);
    return {
      active: all.filter(isActive).sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
      history: all.filter((a) => !isActive(a)),
    };
  }

  async depositInbox(
    status: DepositStatus,
    actor: Actor,
  ): Promise<{ items: DepositInboxItem[]; pendingAmount: number }> {
    const items = await this.readModel.depositInbox({
      status,
      providerId: isAdmin(actor) ? undefined : (actor.providerId ?? '__none__'),
    });
    const pendingAmount = items
      .filter((i) => i.status === DepositStatus.PENDING)
      .reduce((sum, i) => sum + i.amount, 0);
    return { items, pendingAmount };
  }

  async clientDetail(
    clientId: string,
  ): Promise<ClientSummaryView & { appointments: AppointmentView[] }> {
    const client = await this.clients.getById(clientId);
    const appointments = await this.readModel.listByClient(clientId);
    return {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      dni: client.dni,
      phone: client.phone,
      email: client.email,
      hasAccount: client.userId !== null,
      appointments,
    };
  }

  async searchClients(term: string): Promise<ClientSummaryView[]> {
    const clients = await this.clients.search(term);
    return clients.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      dni: c.dni,
      phone: c.phone,
      email: c.email,
      hasAccount: c.userId !== null,
    }));
  }
}
