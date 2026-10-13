import { Injectable } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { Clock } from '../../../shared/domain/clock';
import { MINUTES_PER_DAY } from '../../../shared/domain/interval';
import { AppointmentStatus, OCCUPYING_STATUSES } from '../../scheduling/domain/appointment-status';
import { DepositStatus } from '../../scheduling/domain/deposit';
import {
  computeOccupancy,
  freeMinutesBetweenAppointments,
  percentage,
} from '../../scheduling/domain/occupancy';
import {
  isPerformed,
  Period,
  ReportAppointment,
  ReportDeposit,
  ReportingDataSource,
  sum,
  within,
} from '../domain/reporting.model';
import { DailyProviderAgenda, OccupancyService } from './occupancy.service';

type PeriodValues = { today: number; last24h: number; week: number; month: number };

export interface Dashboard {
  generatedAt: Date;
  daily: {
    appointmentsToday: number;
    paymentsInformed: number;
    paymentsVerified: number;
    paymentsRejected: number;
    paymentsPendingReview: number;
    cancellationsToday: number;
  };
  occupancy: {
    todayPercent: number;
    weekPercent: number;
    freeMinutesBetweenAppointmentsToday: number;
  };
  monthly: {
    servicesPerformed: number;
    topService: { id: string; name: string; count: number } | null;
    uniqueClients: number;
  };
  economic: {
    servicesValue: PeriodValues;
    verifiedDeposits: PeriodValues;
    byProvider: Array<{
      providerId: string;
      displayName: string;
      value: number;
      appointments: number;
    }>;
  };
}

/**
 * Indicadores del dashboard del administrador. Los valores económicos representan actividad
 * registrada, no dinero centralizado (cada prestador cobra en su propia cuenta).
 */
@Injectable()
export class GetDashboardUseCase {
  constructor(
    private readonly data: ReportingDataSource,
    private readonly occupancy: OccupancyService,
    private readonly time: BusinessTime,
    private readonly clock: Clock,
  ) {}

  async execute(): Promise<Dashboard> {
    const now = this.clock.now();
    const today = this.time.localDate(now);
    const weekStart = BusinessTime.startOfWeek(today);
    const monthStart = BusinessTime.startOfMonth(today);
    const periods = {
      today: this.dayRange(today, today),
      last24h: { from: new Date(now.getTime() - 86_400_000), to: now },
      week: this.dayRange(weekStart, BusinessTime.addDays(weekStart, 6)),
      month: this.dayRange(monthStart, today),
    };
    const earliest = new Date(
      Math.min(
        periods.week.from.getTime(),
        periods.month.from.getTime(),
        periods.last24h.from.getTime(),
      ),
    );
    const wide: Period = { from: earliest, to: periods.week.to };

    const [appointments, cancelled, deposits, pending, todayAgendas, weekAgendas] =
      await Promise.all([
        this.data.appointmentsStartingIn(wide),
        this.data.appointmentsCancelledIn(periods.today),
        this.data.depositsUploadedOrReviewedIn(wide),
        this.data.pendingDepositsCount(),
        this.occupancy.dailyAgendas(today, today),
        this.occupancy.dailyAgendas(weekStart, BusinessTime.addDays(weekStart, 6)),
      ]);

    const performed = appointments.filter((a) => isPerformed(a, now));
    const performedIn = (p: Period) => performed.filter((a) => within(a.startAt, p));
    const verifiedIn = (p: Period) =>
      deposits.filter((d) => d.status === DepositStatus.VERIFIED && within(d.reviewedAt, p));
    const values = (fn: (p: Period) => number): PeriodValues => ({
      today: fn(periods.today),
      last24h: fn(periods.last24h),
      week: fn(periods.week),
      month: fn(periods.month),
    });
    const monthPerformed = performedIn(periods.month);

    return {
      generatedAt: now,
      daily: this.daily(appointments, deposits, periods.today, pending, cancelled.length),
      occupancy: {
        todayPercent: this.occupancyPercent(todayAgendas),
        weekPercent: this.occupancyPercent(weekAgendas),
        freeMinutesBetweenAppointmentsToday: todayAgendas.reduce(
          (s, a) => s + freeMinutesBetweenAppointments(a.working, a.busy),
          0,
        ),
      },
      monthly: {
        servicesPerformed: monthPerformed.length,
        topService: this.topService(monthPerformed),
        uniqueClients: new Set(monthPerformed.map((a) => a.clientId)).size,
      },
      economic: {
        servicesValue: values((p) => sum(performedIn(p).map((a) => a.price))),
        verifiedDeposits: values((p) => sum(verifiedIn(p).map((d) => d.amount))),
        byProvider: this.byProvider(monthPerformed),
      },
    };
  }

  private dayRange(from: string, to: string): Period {
    return { from: this.time.toInstant(from, 0), to: this.time.toInstant(to, MINUTES_PER_DAY) };
  }

  private daily(
    appointments: ReportAppointment[],
    deposits: ReportDeposit[],
    today: Period,
    pending: number,
    cancellationsToday: number,
  ): Dashboard['daily'] {
    const reviewedToday = (s: DepositStatus) =>
      deposits.filter((d) => d.status === s && within(d.reviewedAt, today)).length;
    return {
      appointmentsToday: appointments.filter(
        (a) =>
          within(a.startAt, today) &&
          OCCUPYING_STATUSES.includes(a.status) &&
          a.status !== AppointmentStatus.CREATED,
      ).length,
      paymentsInformed: deposits.filter((d) => within(d.uploadedAt, today)).length,
      paymentsVerified: reviewedToday(DepositStatus.VERIFIED),
      paymentsRejected: reviewedToday(DepositStatus.REJECTED),
      paymentsPendingReview: pending,
      cancellationsToday,
    };
  }

  private occupancyPercent(agendas: DailyProviderAgenda[]): number {
    const stats = agendas.map((a) => computeOccupancy(a.working, a.busy));
    return percentage(
      stats.reduce((s, x) => s + x.bookedMinutes, 0),
      stats.reduce((s, x) => s + x.capacityMinutes, 0),
    );
  }

  private topService(list: ReportAppointment[]): Dashboard['monthly']['topService'] {
    const counts = new Map<string, { id: string; name: string; count: number }>();
    for (const a of list) {
      const current = counts.get(a.serviceId) ?? { id: a.serviceId, name: a.serviceName, count: 0 };
      counts.set(a.serviceId, { ...current, count: current.count + 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count)[0] ?? null;
  }

  private byProvider(list: ReportAppointment[]): Dashboard['economic']['byProvider'] {
    const map = new Map<string, Dashboard['economic']['byProvider'][number]>();
    for (const a of list) {
      const current = map.get(a.providerId) ?? {
        providerId: a.providerId,
        displayName: a.providerName,
        value: 0,
        appointments: 0,
      };
      map.set(a.providerId, {
        ...current,
        value: sum([current.value, a.price]),
        appointments: current.appointments + 1,
      });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }
}
