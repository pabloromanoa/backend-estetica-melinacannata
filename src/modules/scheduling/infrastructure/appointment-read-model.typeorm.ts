import { Injectable } from '@nestjs/common';
import { Brackets, SelectQueryBuilder } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { AppointmentReadModel } from '../application/appointment-read-model';
import { AppointmentView, DepositInboxItem, DepositView } from '../application/appointment.views';
import { AppointmentStatus } from '../domain/appointment-status';
import { DepositStatus } from '../domain/deposit';
import { AppointmentListFilter, DepositInboxFilter } from '../domain/scheduling.ports';
import { AppointmentOrmEntity, DepositOrmEntity } from './scheduling.orm-entities';

/** Modelo de lectura: un único query con joins por listado (sin N+1). */
@Injectable()
export class TypeOrmAppointmentReadModel extends AppointmentReadModel {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private base(): SelectQueryBuilder<AppointmentOrmEntity> {
    return this.ctx
      .repository(AppointmentOrmEntity)
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.service', 'service')
      .innerJoinAndSelect('a.provider', 'provider')
      .innerJoinAndSelect('a.client', 'client')
      .leftJoinAndSelect('a.deposits', 'deposit');
  }

  async getById(id: string): Promise<AppointmentView | null> {
    const row = await this.base().where('a.id = :id', { id }).getOne();
    return row ? toView(row) : null;
  }

  async list(filter: AppointmentListFilter): Promise<AppointmentView[]> {
    const qb = this.base()
      .where('a.start_at < :to AND a.end_at > :from', { from: filter.from, to: filter.to })
      .orderBy('a.start_at', 'ASC');
    if (filter.providerIds) {
      if (filter.providerIds.length === 0) return [];
      qb.andWhere('a.provider_id IN (:...providerIds)', { providerIds: filter.providerIds });
    }
    if (filter.statuses?.length)
      qb.andWhere('a.status IN (:...statuses)', { statuses: filter.statuses });
    if (filter.clientId) qb.andWhere('a.client_id = :clientId', { clientId: filter.clientId });
    if (filter.search) {
      const like = `%${filter.search}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where("CONCAT(client.first_name, ' ', client.last_name) LIKE :like", { like })
            .orWhere('client.phone LIKE :like', { like })
            .orWhere('client.dni LIKE :like', { like })
            .orWhere('a.code LIKE :like', { like }),
        ),
      );
    }
    return (await qb.getMany()).map(toView);
  }

  async listByClient(clientId: string): Promise<AppointmentView[]> {
    const rows = await this.base()
      .where('a.client_id = :clientId', { clientId })
      .orderBy('a.start_at', 'DESC')
      .getMany();
    return rows.map(toView);
  }

  async depositInbox(filter: DepositInboxFilter): Promise<DepositInboxItem[]> {
    const qb = this.base()
      .where('deposit.status = :status', { status: filter.status })
      .orderBy('deposit.uploaded_at', 'ASC');
    if (filter.providerId)
      qb.andWhere('a.provider_id = :providerId', { providerId: filter.providerId });
    // Una seña pendiente sólo se revisa si el turno sigue esperando verificación (no cancelado).
    if (filter.status === DepositStatus.PENDING) {
      qb.andWhere('a.status = :informed', { informed: AppointmentStatus.PAYMENT_INFORMED });
    }
    const rows = await qb.getMany();
    return rows.flatMap((row) => {
      const view = toView(row);
      return (row.deposits ?? [])
        .filter((d) => d.status === filter.status)
        .map((d) => ({ ...toDepositView(d), appointment: view }));
    });
  }
}

function toDepositView(d: DepositOrmEntity): DepositView {
  return {
    id: d.id,
    appointmentId: d.appointmentId,
    amount: d.amount,
    status: d.status,
    uploadedAt: d.uploadedAt,
    reviewedAt: d.reviewedAt,
    rejectionReason: d.rejectionReason,
  };
}

function toView(row: AppointmentOrmEntity): AppointmentView {
  const latest = [...(row.deposits ?? [])].sort(
    (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
  )[0];
  const provider = row.provider!;
  const client = row.client!;
  const service = row.service!;
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    startAt: row.startAt,
    endAt: row.endAt,
    holdExpiresAt: row.holdExpiresAt,
    price: row.price,
    depositAmount: row.depositAmount,
    remainingAmount: Math.round((row.price - row.depositAmount) * 100) / 100,
    service: { id: service.id, name: service.name, durationMinutes: service.durationMinutes },
    provider: {
      id: provider.id,
      displayName: provider.displayName,
      specialty: provider.specialty,
      avatarUrl: provider.avatarUrl,
      bankDetails: {
        alias: provider.bankAlias,
        cbu: provider.bankCbu,
        holder: provider.bankHolder,
        cuil: provider.bankCuil,
        bankName: provider.bankName,
      },
    },
    client: {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      dni: client.dni,
      phone: client.phone,
      email: client.email,
      hasAccount: client.userId !== null,
    },
    deposit: latest ? toDepositView(latest) : null,
    rescheduled: row.rescheduled,
    rescheduleReason: row.rescheduleReason,
    cancellationReason: row.cancellationReason,
    cancelledBy: row.cancelledBy,
    depositOutcome: row.depositOutcome,
    createdAt: row.createdAt,
  };
}
