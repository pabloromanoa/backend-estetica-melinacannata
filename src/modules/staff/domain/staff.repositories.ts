import { AvailabilityException, WeeklyAvailabilityRange } from './availability';
import { Provider } from './provider';

export abstract class ProviderRepository {
  abstract findById(id: string): Promise<Provider | null>;
  abstract findByUserId(userId: string): Promise<Provider | null>;
  abstract findByIds(ids: readonly string[]): Promise<Provider[]>;
  abstract list(options: { includeInactive: boolean }): Promise<Provider[]>;
  abstract save(provider: Provider): Promise<void>;
  /** Bloqueo pesimista de las filas (serializa reservas concurrentes por prestador). */
  abstract lockForBooking(ids: readonly string[]): Promise<void>;
}

export interface ProviderSchedule {
  providerId: string;
  weekly: WeeklyAvailabilityRange[];
  exceptions: AvailabilityException[];
}

export abstract class AvailabilityRepository {
  abstract getWeekly(providerId: string): Promise<WeeklyAvailabilityRange[]>;
  abstract replaceWeekly(
    providerId: string,
    ranges: readonly WeeklyAvailabilityRange[],
  ): Promise<void>;
  abstract listExceptions(
    providerId: string,
    from?: string,
    to?: string,
  ): Promise<AvailabilityException[]>;
  abstract findException(id: string): Promise<AvailabilityException | null>;
  abstract addException(exception: AvailabilityException): Promise<void>;
  abstract deleteException(id: string): Promise<void>;
  /** Horario semanal + excepciones del rango para varios prestadores (una sola consulta). */
  abstract getSchedules(
    providerIds: readonly string[],
    from: string,
    to: string,
  ): Promise<ProviderSchedule[]>;
}
