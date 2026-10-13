import { Injectable } from '@nestjs/common';
import { InvalidInputError, NotFoundError } from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { normalizeTags, Treatment } from '../domain/catalog';
import { ServiceRepository, TreatmentRepository } from '../domain/catalog.repositories';
import { CatalogQueryService } from './catalog-query.service';
import { TreatmentView } from './catalog.views';

export interface TreatmentCommand {
  name: string;
  description?: string | null;
  isActive: boolean;
  recommendationTags: string[];
  serviceIds: string[];
}

@Injectable()
export class ManageTreatmentsUseCase {
  constructor(
    private readonly treatments: TreatmentRepository,
    private readonly services: ServiceRepository,
    private readonly queries: CatalogQueryService,
    private readonly ids: IdGenerator,
  ) {}

  create(command: TreatmentCommand): Promise<TreatmentView> {
    return this.persist(this.ids.next(), command);
  }

  async update(id: string, command: TreatmentCommand): Promise<TreatmentView> {
    if (!(await this.treatments.findById(id))) throw new NotFoundError('Tratamiento', id);
    return this.persist(id, command);
  }

  private async persist(id: string, command: TreatmentCommand): Promise<TreatmentView> {
    const name = command.name.trim();
    if (!name) throw new InvalidInputError('El nombre es obligatorio');
    if (command.serviceIds.length === 0) {
      throw new InvalidInputError('Un tratamiento debe incluir al menos un servicio');
    }
    const found = await this.services.findByIds(command.serviceIds);
    const missing = command.serviceIds.find((sid) => !found.some((s) => s.id === sid));
    if (missing) throw new InvalidInputError(`Servicio inexistente: ${missing}`);

    const treatment: Treatment = {
      id,
      name,
      description: command.description?.trim() || null,
      isActive: command.isActive,
      recommendationTags: normalizeTags(command.recommendationTags),
      serviceIds: command.serviceIds,
    };
    await this.treatments.save(treatment);
    return this.queries.getTreatment(id, { publicOnly: false });
  }
}
