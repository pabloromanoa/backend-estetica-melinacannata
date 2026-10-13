import { Injectable } from '@nestjs/common';
import { BookingPolicy } from '../../../shared/domain/booking-policy';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { SalonService, Treatment } from '../domain/catalog';
import {
  CategoryRepository,
  ProviderAssignmentRepository,
  ProviderDirectory,
  ServiceRepository,
  TreatmentRepository,
} from '../domain/catalog.repositories';
import { ServiceView, TreatmentView } from './catalog.views';

export interface ServiceFilter {
  categoryId?: string;
  search?: string;
  includeInactive?: boolean;
}

/** Lecturas del catálogo (público y administración) armadas como vistas listas para la API. */
@Injectable()
export class CatalogQueryService {
  constructor(
    private readonly services: ServiceRepository,
    private readonly categories: CategoryRepository,
    private readonly treatments: TreatmentRepository,
    private readonly assignments: ProviderAssignmentRepository,
    private readonly providers: ProviderDirectory,
    private readonly policy: BookingPolicy,
  ) {}

  async listServices(filter: ServiceFilter = {}): Promise<ServiceView[]> {
    const all = await this.services.list({ includeInactive: !!filter.includeInactive });
    const search = filter.search?.trim().toLowerCase();
    const filtered = all.filter(
      (s) =>
        (!filter.categoryId || s.categoryIds.includes(filter.categoryId)) &&
        (!search || s.name.toLowerCase().includes(search)),
    );
    return this.toViews(filtered, !filter.includeInactive);
  }

  async getService(id: string, options: { publicOnly: boolean }): Promise<ServiceView> {
    const service = await this.services.findById(id);
    if (!service || (options.publicOnly && !service.isActive)) {
      throw new NotFoundError('Servicio', id);
    }
    const [view] = await this.toViews([service], options.publicOnly);
    return view;
  }

  async listTreatments(includeInactive: boolean): Promise<TreatmentView[]> {
    const treatments = await this.treatments.list({ includeInactive });
    return Promise.all(treatments.map((t) => this.toTreatmentView(t, !includeInactive)));
  }

  async getTreatment(id: string, options: { publicOnly: boolean }): Promise<TreatmentView> {
    const treatment = await this.treatments.findById(id);
    if (!treatment || (options.publicOnly && !treatment.isActive)) {
      throw new NotFoundError('Tratamiento', id);
    }
    return this.toTreatmentView(treatment, options.publicOnly);
  }

  private async toTreatmentView(treatment: Treatment, publicOnly: boolean): Promise<TreatmentView> {
    const services = await this.services.findByIds(treatment.serviceIds);
    const ordered = treatment.serviceIds
      .map((id) => services.find((s) => s.id === id))
      .filter((s): s is SalonService => !!s && (!publicOnly || s.isActive));
    return {
      id: treatment.id,
      name: treatment.name,
      description: treatment.description,
      isActive: treatment.isActive,
      recommendationTags: treatment.recommendationTags,
      services: await this.toViews(ordered, publicOnly),
    };
  }

  async toViews(
    services: readonly SalonService[],
    activeProvidersOnly: boolean,
  ): Promise<ServiceView[]> {
    if (services.length === 0) return [];
    const [categories, providerIdsByService] = await Promise.all([
      this.categories.list({ includeInactive: true }),
      this.assignments.providerIdsByService(services.map((s) => s.id)),
    ]);
    const providerSummaries = await this.providers.summariesOf(
      [...providerIdsByService.values()].flat(),
    );
    return services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      imageUrl: service.imageUrl,
      durationMinutes: service.durationMinutes,
      price: service.price,
      depositAmount: this.policy.depositFor(service.price),
      prepMinutes: service.prepMinutes,
      cleanupMinutes: service.cleanupMinutes,
      isActive: service.isActive,
      recommendationTags: service.recommendationTags,
      specificDates: service.specificDates,
      categories: categories.filter(
        (c) => service.categoryIds.includes(c.id) && (!activeProvidersOnly || c.isActive),
      ),
      providers: providerSummaries
        .filter((p) => (providerIdsByService.get(service.id) ?? []).includes(p.id))
        .filter((p) => !activeProvidersOnly || p.isActive)
        .map(({ id, displayName, specialty, avatarUrl }) => ({
          id,
          displayName,
          specialty,
          avatarUrl,
        })),
    }));
  }
}
