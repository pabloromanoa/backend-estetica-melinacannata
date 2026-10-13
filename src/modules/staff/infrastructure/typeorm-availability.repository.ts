import { Injectable } from '@nestjs/common';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { AvailabilityException, DayOfWeek, WeeklyAvailabilityRange } from '../domain/availability';
import { AvailabilityRepository, ProviderSchedule } from '../domain/staff.repositories';
import { AvailabilityExceptionOrmEntity, WeeklyAvailabilityOrmEntity } from './staff.orm-entities';

@Injectable()
export class TypeOrmAvailabilityRepository extends AvailabilityRepository {
  constructor(
    private readonly ctx: TransactionContext,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  private get weekly() {
    return this.ctx.repository(WeeklyAvailabilityOrmEntity);
  }

  private get exceptions() {
    return this.ctx.repository(AvailabilityExceptionOrmEntity);
  }

  async getWeekly(providerId: string): Promise<WeeklyAvailabilityRange[]> {
    const rows = await this.weekly.find({
      where: { providerId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
    return rows.map(toWeekly);
  }

  async replaceWeekly(
    providerId: string,
    ranges: readonly WeeklyAvailabilityRange[],
  ): Promise<void> {
    await this.weekly.delete({ providerId });
    if (ranges.length === 0) return;
    await this.weekly.insert(ranges.map((r) => ({ id: this.ids.next(), providerId, ...r })));
  }

  async listExceptions(
    providerId: string,
    from?: string,
    to?: string,
  ): Promise<AvailabilityException[]> {
    const date =
      from && to
        ? Between(from, to)
        : from
          ? MoreThanOrEqual(from)
          : to
            ? LessThanOrEqual(to)
            : undefined;
    const rows = await this.exceptions.find({
      where: { providerId, ...(date ? { date } : {}) },
      order: { date: 'ASC', startTime: 'ASC' },
    });
    return rows.map(toException);
  }

  async findException(id: string): Promise<AvailabilityException | null> {
    const row = await this.exceptions.findOneBy({ id });
    return row ? toException(row) : null;
  }

  async addException(exception: AvailabilityException): Promise<void> {
    await this.exceptions.insert({ ...exception });
  }

  async deleteException(id: string): Promise<void> {
    await this.exceptions.delete({ id });
  }

  async getSchedules(
    providerIds: readonly string[],
    from: string,
    to: string,
  ): Promise<ProviderSchedule[]> {
    if (providerIds.length === 0) return [];
    const ids = [...providerIds];
    const [weeklyRows, exceptionRows] = await Promise.all([
      this.weekly.findBy({ providerId: In(ids) }),
      this.exceptions.findBy({ providerId: In(ids), date: Between(from, to) }),
    ]);
    return ids.map((providerId) => ({
      providerId,
      weekly: weeklyRows.filter((r) => r.providerId === providerId).map(toWeekly),
      exceptions: exceptionRows.filter((r) => r.providerId === providerId).map(toException),
    }));
  }
}

function toWeekly(row: WeeklyAvailabilityOrmEntity): WeeklyAvailabilityRange {
  return { dayOfWeek: row.dayOfWeek as DayOfWeek, startTime: row.startTime, endTime: row.endTime };
}

function toException(row: AvailabilityExceptionOrmEntity): AvailabilityException {
  return {
    id: row.id,
    providerId: row.providerId,
    date: row.date,
    type: row.type,
    startTime: row.startTime,
    endTime: row.endTime,
    reason: row.reason,
  };
}
