import { Injectable } from '@nestjs/common';
import { Brackets, LessThanOrEqual } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { Appointment } from '../domain/appointment';
import { AppointmentStatus } from '../domain/appointment-status';
import { Deposit } from '../domain/deposit';
import {
  AppointmentRepository,
  BlockedRange,
  DepositRepository,
  OccupancyQuery,
} from '../domain/scheduling.ports';
import { AppointmentOrmEntity, DepositOrmEntity } from './scheduling.orm-entities';

const FIRM_STATUSES = [
  AppointmentStatus.PAYMENT_INFORMED,
  AppointmentStatus.DEPOSIT_PAID,
  AppointmentStatus.FINISHED,
];

@Injectable()
export class TypeOrmAppointmentRepository extends AppointmentRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(AppointmentOrmEntity);
  }

  async findById(id: string): Promise<Appointment | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toAppointment(row) : null;
  }

  async findByGuestTokenHash(hash: string): Promise<Appointment | null> {
    const row = await this.repo.findOneBy({ guestTokenHash: hash });
    return row ? toAppointment(row) : null;
  }

  async save(appointment: Appointment): Promise<void> {
    await this.repo.save(this.repo.create({ ...appointment.snapshot() }));
  }

  async findBlockedRanges(query: OccupancyQuery): Promise<BlockedRange[]> {
    if (query.providerIds.length === 0) return [];
    const qb = this.repo
      .createQueryBuilder('a')
      .select(['a.id', 'a.providerId', 'a.blockedFrom', 'a.blockedUntil'])
      .where('a.provider_id IN (:...providerIds)', { providerIds: [...query.providerIds] })
      .andWhere('a.blocked_from < :to AND a.blocked_until > :from', {
        from: query.from,
        to: query.to,
      })
      .andWhere(
        new Brackets((w) =>
          w
            .where('a.status IN (:...firm)', { firm: FIRM_STATUSES })
            .orWhere('(a.status = :created AND a.hold_expires_at > :now)', {
              created: AppointmentStatus.CREATED,
              now: query.now,
            }),
        ),
      );
    if (query.excludeAppointmentId)
      qb.andWhere('a.id <> :exclude', { exclude: query.excludeAppointmentId });
    const rows = await qb.getMany();
    return rows.map((r) => ({
      appointmentId: r.id,
      providerId: r.providerId,
      blockedFrom: r.blockedFrom,
      blockedUntil: r.blockedUntil,
    }));
  }

  async findWithElapsedHold(now: Date, limit: number): Promise<Appointment[]> {
    const rows = await this.repo.find({
      where: { status: AppointmentStatus.CREATED, holdExpiresAt: LessThanOrEqual(now) },
      take: limit,
    });
    return rows.map(toAppointment);
  }

  async findDueForReminder(from: Date, to: Date, minLeadHours: number): Promise<Appointment[]> {
    const rows = await this.repo
      .createQueryBuilder('a')
      .where('a.status = :status', { status: AppointmentStatus.DEPOSIT_PAID })
      .andWhere('a.reminder_sent_at IS NULL')
      .andWhere('a.start_at >= :from AND a.start_at < :to', { from, to })
      // No se envía recordatorio si la reserva se creó con menos de 24 h de anticipación.
      .andWhere('TIMESTAMPDIFF(MINUTE, a.created_at, a.start_at) >= :minutes', {
        minutes: minLeadHours * 60,
      })
      .getMany();
    return rows.map(toAppointment);
  }

  async codeExists(code: string): Promise<boolean> {
    return (await this.repo.countBy({ code })) > 0;
  }
}

function toAppointment(row: AppointmentOrmEntity): Appointment {
  return Appointment.restore({
    id: row.id,
    code: row.code,
    clientId: row.clientId,
    providerId: row.providerId,
    serviceId: row.serviceId,
    startAt: row.startAt,
    endAt: row.endAt,
    blockedFrom: row.blockedFrom,
    blockedUntil: row.blockedUntil,
    status: row.status,
    holdExpiresAt: row.holdExpiresAt,
    price: row.price,
    depositAmount: row.depositAmount,
    guestTokenHash: row.guestTokenHash,
    createdByStaff: row.createdByStaff,
    rescheduled: row.rescheduled,
    rescheduleReason: row.rescheduleReason,
    cancellationReason: row.cancellationReason,
    cancelledBy: row.cancelledBy,
    depositOutcome: row.depositOutcome,
    cancelledAt: row.cancelledAt,
    recommendationId: row.recommendationId,
    reminderSentAt: row.reminderSentAt,
    createdAt: row.createdAt,
  });
}

@Injectable()
export class TypeOrmDepositRepository extends DepositRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(DepositOrmEntity);
  }

  async findById(id: string): Promise<Deposit | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDeposit(row) : null;
  }

  async findLatestByAppointment(appointmentId: string): Promise<Deposit | null> {
    const row = await this.repo.findOne({
      where: { appointmentId },
      order: { uploadedAt: 'DESC' },
    });
    return row ? toDeposit(row) : null;
  }

  async save(deposit: Deposit): Promise<void> {
    await this.repo.save(this.repo.create({ ...deposit.snapshot() }));
  }
}

function toDeposit(row: DepositOrmEntity): Deposit {
  return Deposit.restore({
    id: row.id,
    appointmentId: row.appointmentId,
    amount: row.amount,
    status: row.status,
    receiptKey: row.receiptKey,
    receiptSizeBytes: row.receiptSizeBytes,
    uploadedAt: row.uploadedAt,
    reviewedAt: row.reviewedAt,
    reviewedByUserId: row.reviewedByUserId,
    rejectionReason: row.rejectionReason,
  });
}
