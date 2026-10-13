import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { InvalidInputError, NotFoundError } from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { normalizeTags, SalonService, validateService } from '../domain/catalog';
import {
  CategoryRepository,
  ProviderAssignmentRepository,
  ProviderDirectory,
  ServiceRepository,
} from '../domain/catalog.repositories';
import { CatalogQueryService } from './catalog-query.service';
import { ServiceView } from './catalog.views';

export interface ServiceCommand {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  durationMinutes: number;
  price: number;
  prepMinutes: number;
  cleanupMinutes: number;
  isActive: boolean;
  categoryIds: string[];
  providerIds: string[];
  recommendationTags: string[];
  specificDates: string[];
}

/** Alta y edición de servicios (rol ADMIN). */
@Injectable()
export class ManageServicesUseCase {
  constructor(
    private readonly services: ServiceRepository,
    private readonly categories: CategoryRepository,
    private readonly assignments: ProviderAssignmentRepository,
    private readonly providers: ProviderDirectory,
    private readonly queries: CatalogQueryService,
    private readonly ids: IdGenerator,
    private readonly uow: UnitOfWork,
  ) {}

  create(command: ServiceCommand): Promise<ServiceView> {
    return this.persist(this.ids.next(), command);
  }

  async update(id: string, command: ServiceCommand): Promise<ServiceView> {
    if (!(await this.services.findById(id))) throw new NotFoundError('Servicio', id);
    return this.persist(id, command);
  }

  private async persist(id: string, command: ServiceCommand): Promise<ServiceView> {
    const service: SalonService = {
      id,
      name: command.name.trim(),
      description: command.description?.trim() || null,
      imageUrl: command.imageUrl?.trim() || null,
      durationMinutes: command.durationMinutes,
      price: command.price,
      prepMinutes: command.prepMinutes,
      cleanupMinutes: command.cleanupMinutes,
      isActive: command.isActive,
      recommendationTags: normalizeTags(command.recommendationTags),
      specificDates: [...new Set(command.specificDates)].sort(),
      categoryIds: [...new Set(command.categoryIds)],
    };
    validateService(service);
    await this.assertReferencesExist(service.categoryIds, command.providerIds);

    await this.uow.run(async () => {
      await this.services.save(service);
      await this.assignments.setProvidersOfService(id, command.providerIds);
    });
    return this.queries.getService(id, { publicOnly: false });
  }

  private async assertReferencesExist(categoryIds: string[], providerIds: string[]): Promise<void> {
    const categories = await this.categories.list({ includeInactive: true });
    const missingCategory = categoryIds.find((cid) => !categories.some((c) => c.id === cid));
    if (missingCategory) throw new InvalidInputError(`Categoría inexistente: ${missingCategory}`);

    const providers = await this.providers.summariesOf(providerIds);
    const missingProvider = providerIds.find((pid) => !providers.some((p) => p.id === pid));
    if (missingProvider) throw new InvalidInputError(`Prestador inexistente: ${missingProvider}`);
  }
}
