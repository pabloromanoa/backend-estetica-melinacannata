import { Injectable } from '@nestjs/common';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { RecommendationOrmEntity } from '../../recommendations/infrastructure/recommendation.orm-entity';
import { AppointmentStatus } from '../../scheduling/domain/appointment-status';
import { DepositStatus } from '../../scheduling/domain/deposit';
import {
  AppointmentOrmEntity,
  DepositOrmEntity,
} from '../../scheduling/infrastructure/scheduling.orm-entities';
import {
  Period,
  ReportAppointment,
  ReportDeposit,
  ReportingDataSource,
  ReportRecommendation,
} from '../domain/reporting.model';

@Injectable()
export class TypeOrmReportingDataSource extends ReportingDataSource {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private appointments() {
    return this.ctx
      .repository(AppointmentOrmEntity)
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.service', 'service')
      .innerJoinAndSelect('a.provider', 'provider')
      .innerJoinAndSelect('a.client', 'client');
  }

  async appointmentsStartingIn(period: Period): Promise<ReportAppointment[]> {
    const rows = await this.appointments()
      .where('a.start_at >= :from AND a.start_at < :to', period)
      .getMany();
    return rows.map(toReport);
  }

  async appointmentsCancelledIn(period: Period): Promise<ReportAppointment[]> {
    const rows = await this.appointments()
      .where('a.cancelled_at >= :from AND a.cancelled_at < :to', period)
      .orderBy('a.cancelled_at', 'ASC')
      .getMany();
    return rows.map(toReport);
  }

  async depositsUploadedOrReviewedIn(period: Period): Promise<ReportDeposit[]> {
    const rows = await this.ctx
      .repository(DepositOrmEntity)
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.appointment', 'a')
      .where(
        '(d.uploaded_at >= :from AND d.uploaded_at < :to) OR (d.reviewed_at >= :from AND d.reviewed_at < :to)',
        period,
      )
      .getMany();
    return rows.map((d) => ({
      status: d.status,
      amount: d.amount,
      providerId: d.appointment!.providerId,
      uploadedAt: d.uploadedAt,
      reviewedAt: d.reviewedAt,
    }));
  }

  pendingDepositsCount(): Promise<number> {
    return this.ctx
      .repository(DepositOrmEntity)
      .createQueryBuilder('d')
      .innerJoin('d.appointment', 'a')
      .where('d.status = :pending', { pending: DepositStatus.PENDING })
      .andWhere('a.status = :informed', { informed: AppointmentStatus.PAYMENT_INFORMED })
      .getCount();
  }

  async recommendationsIn(period: Period): Promise<ReportRecommendation[]> {
    const rows = await this.ctx
      .repository(RecommendationOrmEntity)
      .createQueryBuilder('r')
      .leftJoin('services', 's', 's.id = r.service_id')
      .leftJoin('treatments', 't', 't.id = r.treatment_id')
      .select([
        'r.type AS type',
        'r.confidence AS confidence',
        'r.outcome AS outcome',
        'r.led_to_booking AS ledToBooking',
        'COALESCE(s.name, t.name) AS optionName',
      ])
      .where('r.created_at >= :from AND r.created_at < :to', period)
      .getRawMany<{
        type: 'SERVICE' | 'TREATMENT';
        confidence: string;
        outcome: ReportRecommendation['outcome'];
        ledToBooking: number | boolean;
        optionName: string | null;
      }>();
    return rows.map((r) => ({
      type: r.type,
      confidence: Number(r.confidence),
      outcome: r.outcome,
      ledToBooking: Boolean(Number(r.ledToBooking)),
      optionName: r.optionName ?? '(eliminado)',
    }));
  }
}

function toReport(a: AppointmentOrmEntity): ReportAppointment {
  return {
    id: a.id,
    status: a.status,
    startAt: a.startAt,
    endAt: a.endAt,
    providerId: a.providerId,
    providerName: a.provider!.displayName,
    serviceId: a.serviceId,
    serviceName: a.service!.name,
    clientId: a.clientId,
    clientName: `${a.client!.firstName} ${a.client!.lastName}`,
    price: a.price,
    depositOutcome: a.depositOutcome,
    cancellationReason: a.cancellationReason,
    cancelledBy: a.cancelledBy,
    cancelledAt: a.cancelledAt,
  };
}
