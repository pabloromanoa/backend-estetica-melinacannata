import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import {
  AvailabilityException,
  validateException,
  validateWeeklyRanges,
  WeeklyAvailabilityRange,
} from '../domain/availability';
import { AvailabilityRepository, ProviderRepository } from '../domain/staff.repositories';

export type ExceptionCommand = Omit<AvailabilityException, 'id' | 'providerId'>;

/** Disponibilidad semanal habitual y excepciones puntuales de un prestador. */
@Injectable()
export class AvailabilityUseCases {
  constructor(
    private readonly availability: AvailabilityRepository,
    private readonly providers: ProviderRepository,
    private readonly ids: IdGenerator,
  ) {}

  async getWeekly(providerId: string): Promise<WeeklyAvailabilityRange[]> {
    await this.assertProvider(providerId);
    return this.availability.getWeekly(providerId);
  }

  async replaceWeekly(
    providerId: string,
    ranges: WeeklyAvailabilityRange[],
  ): Promise<WeeklyAvailabilityRange[]> {
    await this.assertProvider(providerId);
    validateWeeklyRanges(ranges);
    await this.availability.replaceWeekly(providerId, ranges);
    return this.availability.getWeekly(providerId);
  }

  async listExceptions(
    providerId: string,
    from?: string,
    to?: string,
  ): Promise<AvailabilityException[]> {
    await this.assertProvider(providerId);
    return this.availability.listExceptions(providerId, from, to);
  }

  async addException(
    providerId: string,
    command: ExceptionCommand,
  ): Promise<AvailabilityException> {
    await this.assertProvider(providerId);
    const input: ExceptionCommand = {
      date: command.date,
      type: command.type,
      startTime: command.startTime ?? null,
      endTime: command.endTime ?? null,
      reason: command.reason?.trim() || null,
    };
    validateException(input);
    const exception: AvailabilityException = { id: this.ids.next(), providerId, ...input };
    await this.availability.addException(exception);
    return exception;
  }

  async removeException(providerId: string, exceptionId: string): Promise<void> {
    const exception = await this.availability.findException(exceptionId);
    if (!exception || exception.providerId !== providerId) {
      throw new NotFoundError('Excepción', exceptionId);
    }
    await this.availability.deleteException(exceptionId);
  }

  private async assertProvider(providerId: string): Promise<void> {
    if (!(await this.providers.findById(providerId)))
      throw new NotFoundError('Prestador', providerId);
  }
}
