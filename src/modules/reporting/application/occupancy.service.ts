import { Injectable } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { Interval, lengthOf } from '../../../shared/domain/interval';
import { AvailabilityService } from '../../scheduling/application/availability.service';
import { computeOccupancy } from '../../scheduling/domain/occupancy';
import { ProviderRepository } from '../../staff/domain/staff.repositories';
import { ProviderOccupancy } from '../domain/report-builders';

export interface DailyProviderAgenda {
  providerId: string;
  date: string;
  working: Interval[];
  busy: Interval[];
}

/** Ocupación de agenda por prestador en un rango de fechas (reutiliza el motor de disponibilidad). */
@Injectable()
export class OccupancyService {
  constructor(
    private readonly providers: ProviderRepository,
    private readonly availability: AvailabilityService,
  ) {}

  async dailyAgendas(from: string, to: string): Promise<DailyProviderAgenda[]> {
    const providers = await this.providers.list({ includeInactive: false });
    const ids = providers.map((p) => p.id);
    const result: DailyProviderAgenda[] = [];
    for (const date of BusinessTime.datesBetween(from, to)) {
      const days = await this.availability.providerDays(ids, date);
      result.push(
        ...days.map((d) => ({
          providerId: d.providerId,
          date,
          working: [...d.working],
          busy: [...d.busy],
        })),
      );
    }
    return result;
  }

  async byProvider(from: string, to: string): Promise<ProviderOccupancy[]> {
    const [providers, agendas] = await Promise.all([
      this.providers.list({ includeInactive: false }),
      this.dailyAgendas(from, to),
    ]);
    return providers.map((p) => {
      const stats = agendas
        .filter((a) => a.providerId === p.id)
        .map((a) => computeOccupancy(a.working, a.busy));
      return {
        providerId: p.id,
        providerName: p.displayName,
        capacityMinutes: stats.reduce((s, x) => s + x.capacityMinutes, 0),
        bookedMinutes: stats.reduce((s, x) => s + x.bookedMinutes, 0),
        freeMinutes: stats.reduce((s, x) => s + x.freeMinutes, 0),
        gapCount: stats.reduce((s, x) => s + x.gaps.length, 0),
        gapMinutes: stats.reduce((s, x) => s + x.gaps.reduce((g, i) => g + lengthOf(i), 0), 0),
      };
    });
  }
}
