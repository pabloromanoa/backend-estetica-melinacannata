import { Category, SalonService, Treatment } from './catalog';

export abstract class ServiceRepository {
  abstract findById(id: string): Promise<SalonService | null>;
  abstract findByIds(ids: readonly string[]): Promise<SalonService[]>;
  abstract list(options: { includeInactive: boolean }): Promise<SalonService[]>;
  abstract save(service: SalonService): Promise<void>;
}

export abstract class CategoryRepository {
  abstract findById(id: string): Promise<Category | null>;
  abstract list(options: { includeInactive: boolean }): Promise<Category[]>;
  abstract save(category: Category): Promise<void>;
  /** Elimina la categoría y SOLO sus asociaciones; los servicios quedan intactos. */
  abstract delete(id: string): Promise<void>;
}

export abstract class TreatmentRepository {
  abstract findById(id: string): Promise<Treatment | null>;
  abstract list(options: { includeInactive: boolean }): Promise<Treatment[]>;
  abstract save(treatment: Treatment): Promise<void>;
}

/** Relación M:N prestador ⇄ servicio ("prestadores habilitados"). */
export abstract class ProviderAssignmentRepository {
  abstract providerIdsOf(serviceId: string): Promise<string[]>;
  abstract serviceIdsOf(providerId: string): Promise<string[]>;
  abstract providerIdsByService(serviceIds: readonly string[]): Promise<Map<string, string[]>>;
  abstract setProvidersOfService(serviceId: string, providerIds: readonly string[]): Promise<void>;
  abstract setServicesOfProvider(providerId: string, serviceIds: readonly string[]): Promise<void>;
}

export interface ProviderSummary {
  id: string;
  displayName: string;
  specialty: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

/** Lectura mínima de prestadores que necesita el catálogo (evita depender del módulo Staff). */
export abstract class ProviderDirectory {
  abstract summariesOf(ids: readonly string[]): Promise<ProviderSummary[]>;
}
