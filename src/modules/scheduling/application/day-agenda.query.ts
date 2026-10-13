import { Injectable } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { formatTime, MINUTES_PER_DAY } from '../../../shared/domain/interval';
import { Actor, isAdmin } from '../../../shared/domain/role';
import { ProviderRepository } from '../../staff/domain/staff.repositories';
import { AppointmentStatus, OCCUPYING_STATUSES } from '../domain/appointment-status';
import { computeOccupancy } from '../domain/occupancy';
import { AppointmentReadModel } from './appointment-read-model';
import { AppointmentView, ProviderSummaryView } from './appointment.views';
import { AvailabilityService } from './availability.service';

export interface AgendaColumn extends ProviderSummaryView {
  workingRanges: { startTime: string; endTime: string }[];
  appointments: AppointmentView[];
}

export interface DayAgenda {
  date: string;
  providers: AgendaColumn[];
  summary: {
    appointments: number;
    capacityMinutes: number;
    bookedMinutes: number;
    pendingDeposits: number;
    freeGaps: number;
  };
}

/** Agenda diaria por prestador (vista "Agenda Inteligente" del prototipo). */
@Injectable()
export class DayAgendaQuery {
  constructor(
    private readonly providers: ProviderRepository,
    private readonly availability: AvailabilityService,
    private readonly readModel: AppointmentReadModel,
    private readonly time: BusinessTime,
  ) {}

  async execute(date: string, actor: Actor): Promise<DayAgenda> {
    BusinessTime.assertDate(date);
    const providers = isAdmin(actor)
      ? await this.providers.list({ includeInactive: false })
      : await this.providers.findByIds(actor.providerId ? [actor.providerId] : []);
    const ids = providers.map((p) => p.id);

    const [days, appointments] = await Promise.all([
      this.availability.providerDays(ids, date),
      ids.length
        ? this.readModel.list({
            from: this.time.toInstant(date, 0),
            to: this.time.toInstant(date, MINUTES_PER_DAY),
            providerIds: ids,
          })
        : Promise.resolve([]),
    ]);

    const visible = appointments.filter((a) => a.status !== AppointmentStatus.EXPIRED);
    const stats = days.map((d) => computeOccupancy(d.working, d.busy));

    return {
      date,
      providers: providers.map((p) => {
        const day = days.find((d) => d.providerId === p.id);
        return {
          id: p.id,
          displayName: p.displayName,
          specialty: p.specialty,
          avatarUrl: p.avatarUrl,
          workingRanges: (day?.working ?? []).map((i) => ({
            startTime: formatTime(i.start),
            endTime: formatTime(i.end),
          })),
          appointments: visible.filter((a) => a.provider.id === p.id),
        };
      }),
      summary: {
        appointments: visible.filter((a) => OCCUPYING_STATUSES.includes(a.status)).length,
        capacityMinutes: stats.reduce((s, x) => s + x.capacityMinutes, 0),
        bookedMinutes: stats.reduce((s, x) => s + x.bookedMinutes, 0),
        pendingDeposits: visible.filter((a) => a.status === AppointmentStatus.PAYMENT_INFORMED)
          .length,
        freeGaps: stats.reduce((s, x) => s + x.gaps.length, 0),
      },
    };
  }
}
