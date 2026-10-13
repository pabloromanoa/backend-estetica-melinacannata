import { Injectable } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { Clock } from '../../../shared/domain/clock';
import { InvalidInputError, NotFoundError } from '../../../shared/domain/domain-error';
import { Interval, MINUTES_PER_DAY } from '../../../shared/domain/interval';
import { isOfferedOn, SalonService } from '../../catalog/domain/catalog';
import {
  ProviderAssignmentRepository,
  ServiceRepository,
} from '../../catalog/domain/catalog.repositories';
import { Provider } from '../../staff/domain/provider';
import { AvailabilityRepository, ProviderRepository } from '../../staff/domain/staff.repositories';
import { resolveWorkingIntervals } from '../../staff/domain/working-schedule';
import {
  computeAvailability,
  ProviderDay,
  providersAvailableAt,
  ServiceTiming,
} from '../domain/availability-engine';
import { ProviderNotQualifiedError } from '../domain/scheduling.errors';
import { AppointmentRepository } from '../domain/scheduling.ports';
import { ProviderSummaryView } from './appointment.views';

/** Redondeo del "ahora" para no ofrecer horarios como 11:47. */
export const NOW_ROUNDING_MINUTES = 15;
export const MAX_SEARCH_DAYS = 31;

export interface AvailableSlotView {
  startAt: Date;
  endAt: Date;
  providers: ProviderSummaryView[];
  contiguous: boolean;
}

export interface SlotQuery {
  serviceId: string;
  date: string;
  providerId?: string;
  excludeAppointmentId?: string;
}

const toSummary = (p: Provider): ProviderSummaryView => ({
  id: p.id,
  displayName: p.displayName,
  specialty: p.specialty,
  avatarUrl: p.avatarUrl,
});

/**
 * Orquesta el motor de disponibilidad: carga servicio, prestadores habilitados, horarios,
 * excepciones y turnos ocupados, y delega el cálculo a las funciones puras del dominio.
 */
@Injectable()
export class AvailabilityService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly assignments: ProviderAssignmentRepository,
    private readonly providers: ProviderRepository,
    private readonly availability: AvailabilityRepository,
    private readonly appointments: AppointmentRepository,
    private readonly time: BusinessTime,
    private readonly clock: Clock,
  ) {}

  async getBookableService(serviceId: string): Promise<SalonService> {
    const service = await this.services.findById(serviceId);
    if (!service || !service.isActive) throw new NotFoundError('Servicio', serviceId);
    return service;
  }

  /** Prestadores activos habilitados para el servicio (o el elegido, validando que lo realice). */
  async candidateProviders(service: SalonService, providerId?: string): Promise<Provider[]> {
    const assignedIds = await this.assignments.providerIdsOf(service.id);
    if (providerId && !assignedIds.includes(providerId)) throw new ProviderNotQualifiedError();
    const ids = providerId ? [providerId] : assignedIds;
    const providers = await this.providers.findByIds(ids);
    return providers.filter((p) => p.isActive);
  }

  async slots(query: SlotQuery): Promise<AvailableSlotView[]> {
    BusinessTime.assertDate(query.date);
    const service = await this.getBookableService(query.serviceId);
    const candidates = await this.candidateProviders(service, query.providerId);
    return this.slotsFor(service, candidates, query.date, query.excludeAppointmentId);
  }

  /** Próximos horarios disponibles a partir de una fecha (sugerencias multi-día). */
  async nextSlots(input: {
    serviceId: string;
    providerId?: string;
    fromDate?: string;
    days: number;
    limit: number;
  }): Promise<AvailableSlotView[]> {
    if (input.days < 1 || input.days > MAX_SEARCH_DAYS) {
      throw new InvalidInputError(`Se pueden consultar entre 1 y ${MAX_SEARCH_DAYS} días`);
    }
    const service = await this.getBookableService(input.serviceId);
    const candidates = await this.candidateProviders(service, input.providerId);
    const today = this.time.localDate(this.clock.now());
    const from = input.fromDate && input.fromDate > today ? input.fromDate : today;

    const result: AvailableSlotView[] = [];
    for (let i = 0; i < input.days && result.length < input.limit; i++) {
      const date = BusinessTime.addDays(from, i);
      result.push(...(await this.slotsFor(service, candidates, date)));
    }
    return result.slice(0, input.limit);
  }

  /**
   * Validación final previa a confirmar: ¿qué prestadores pueden atender EXACTAMENTE en `startAt`?
   * Debe invocarse dentro de la transacción, después de bloquear a los prestadores.
   */
  async providersFreeAt(input: {
    service: SalonService;
    providerIds: string[];
    startAt: Date;
    excludeAppointmentId?: string;
  }): Promise<string[]> {
    const date = this.time.localDate(input.startAt);
    if (!isOfferedOn(input.service, date)) return [];
    const days = await this.providerDays(input.providerIds, date, input.excludeAppointmentId);
    const start = this.time.minutesFromStartOf(date, input.startAt);
    return providersAvailableAt(days, input.service, start, this.earliestBlockStart(date));
  }

  /** Jornada y ocupación de cada prestador en una fecha (también la usa la agenda). */
  async providerDays(
    providerIds: readonly string[],
    date: string,
    excludeAppointmentId?: string,
  ): Promise<ProviderDay[]> {
    if (providerIds.length === 0) return [];
    const now = this.clock.now();
    const [schedules, blocked] = await Promise.all([
      this.availability.getSchedules(providerIds, date, date),
      this.appointments.findBlockedRanges({
        providerIds,
        from: this.time.toInstant(date, 0),
        to: this.time.toInstant(date, MINUTES_PER_DAY),
        now,
        excludeAppointmentId,
      }),
    ]);
    return schedules.map((schedule) => ({
      providerId: schedule.providerId,
      working: resolveWorkingIntervals(date, schedule.weekly, schedule.exceptions),
      busy: blocked
        .filter((b) => b.providerId === schedule.providerId)
        .map((b): Interval => ({
          start: this.time.minutesFromStartOf(date, b.blockedFrom),
          end: this.time.minutesFromStartOf(date, b.blockedUntil),
        })),
    }));
  }

  private async slotsFor(
    service: SalonService,
    candidates: Provider[],
    date: string,
    excludeAppointmentId?: string,
  ): Promise<AvailableSlotView[]> {
    const earliest = this.earliestBlockStart(date);
    if (!isOfferedOn(service, date) || earliest >= MINUTES_PER_DAY || candidates.length === 0) {
      return [];
    }
    const days = await this.providerDays(
      candidates.map((p) => p.id),
      date,
      excludeAppointmentId,
    );
    const timing: ServiceTiming = service;
    return computeAvailability(days, timing, earliest).map((slot) => ({
      startAt: this.time.toInstant(date, slot.start),
      endAt: this.time.toInstant(date, slot.end),
      providers: candidates.filter((p) => slot.providerIds.includes(p.id)).map(toSummary),
      contiguous: slot.contiguous,
    }));
  }

  /** Primer minuto en que puede empezar un bloque: nada en el pasado. */
  private earliestBlockStart(date: string): number {
    const now = this.clock.now();
    const today = this.time.localDate(now);
    if (date < today) return MINUTES_PER_DAY;
    if (date > today) return 0;
    const minutes = this.time.minutesFromStartOf(date, now);
    return Math.ceil(minutes / NOW_ROUNDING_MINUTES) * NOW_ROUNDING_MINUTES;
  }
}
