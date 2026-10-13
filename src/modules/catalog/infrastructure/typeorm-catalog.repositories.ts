import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { Category, SalonService, Treatment } from '../domain/catalog';
import {
  CategoryRepository,
  ProviderDirectory,
  ProviderSummary,
  ProviderAssignmentRepository,
  ServiceRepository,
  TreatmentRepository,
} from '../domain/catalog.repositories';
import {
  CategoryOrmEntity,
  ProviderServiceOrmEntity,
  ServiceDateOrmEntity,
  ServiceOrmEntity,
  TreatmentOrmEntity,
  TreatmentServiceOrmEntity,
} from './catalog.orm-entities';
import { ProviderOrmEntity } from '../../staff/infrastructure/staff.orm-entities';

const SERVICE_RELATIONS = { categories: true, dates: true } as const;

export function toSalonService(row: ServiceOrmEntity): SalonService {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl,
    durationMinutes: row.durationMinutes,
    price: row.price,
    prepMinutes: row.prepMinutes,
    cleanupMinutes: row.cleanupMinutes,
    isActive: row.isActive,
    recommendationTags: row.recommendationTags ?? [],
    specificDates: (row.dates ?? []).map((d) => d.date).sort(),
    categoryIds: (row.categories ?? []).map((c) => c.id),
  };
}

@Injectable()
export class TypeOrmServiceRepository extends ServiceRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(ServiceOrmEntity);
  }

  async findById(id: string): Promise<SalonService | null> {
    const row = await this.repo.findOne({ where: { id }, relations: SERVICE_RELATIONS });
    return row ? toSalonService(row) : null;
  }

  async findByIds(ids: readonly string[]): Promise<SalonService[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.find({
      where: { id: In([...ids]) },
      relations: SERVICE_RELATIONS,
    });
    return rows.map(toSalonService);
  }

  async list({ includeInactive }: { includeInactive: boolean }): Promise<SalonService[]> {
    const rows = await this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      relations: SERVICE_RELATIONS,
      order: { name: 'ASC' },
    });
    return rows.map(toSalonService);
  }

  async save(service: SalonService): Promise<void> {
    const { specificDates, categoryIds, ...fields } = service;
    await this.ctx.repository(ServiceDateOrmEntity).delete({ serviceId: service.id });
    await this.repo.save(
      this.repo.create({
        ...fields,
        categories: categoryIds.map((id) => ({ id }) as CategoryOrmEntity),
        dates: specificDates.map((date) => ({ serviceId: service.id, date })),
      }),
    );
  }
}

@Injectable()
export class TypeOrmCategoryRepository extends CategoryRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(CategoryOrmEntity);
  }

  async findById(id: string): Promise<Category | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? { id: row.id, name: row.name, isActive: row.isActive } : null;
  }

  async list({ includeInactive }: { includeInactive: boolean }): Promise<Category[]> {
    const rows = await this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name, isActive: r.isActive }));
  }

  async save(category: Category): Promise<void> {
    await this.repo.save(this.repo.create(category));
  }

  async delete(id: string): Promise<void> {
    // La FK de service_categories tiene ON DELETE CASCADE: sólo se borran las asociaciones.
    await this.repo.delete({ id });
  }
}

@Injectable()
export class TypeOrmTreatmentRepository extends TreatmentRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(TreatmentOrmEntity);
  }

  async findById(id: string): Promise<Treatment | null> {
    const row = await this.repo.findOne({ where: { id }, relations: { steps: true } });
    return row ? toTreatment(row) : null;
  }

  async list({ includeInactive }: { includeInactive: boolean }): Promise<Treatment[]> {
    const rows = await this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      relations: { steps: true },
      order: { name: 'ASC' },
    });
    return rows.map(toTreatment);
  }

  async save(treatment: Treatment): Promise<void> {
    const { serviceIds, ...fields } = treatment;
    await this.ctx.repository(TreatmentServiceOrmEntity).delete({ treatmentId: treatment.id });
    await this.repo.save(
      this.repo.create({
        ...fields,
        steps: serviceIds.map((serviceId, position) => ({
          treatmentId: treatment.id,
          serviceId,
          position,
        })),
      }),
    );
  }
}

function toTreatment(row: TreatmentOrmEntity): Treatment {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.isActive,
    recommendationTags: row.recommendationTags ?? [],
    serviceIds: [...(row.steps ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.serviceId),
  };
}

@Injectable()
export class TypeOrmProviderAssignmentRepository extends ProviderAssignmentRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(ProviderServiceOrmEntity);
  }

  async providerIdsOf(serviceId: string): Promise<string[]> {
    return (await this.repo.findBy({ serviceId })).map((r) => r.providerId);
  }

  async serviceIdsOf(providerId: string): Promise<string[]> {
    return (await this.repo.findBy({ providerId })).map((r) => r.serviceId);
  }

  async providerIdsByService(serviceIds: readonly string[]): Promise<Map<string, string[]>> {
    const result = new Map<string, string[]>(serviceIds.map((id) => [id, []]));
    if (serviceIds.length === 0) return result;
    const rows = await this.repo.findBy({ serviceId: In([...serviceIds]) });
    rows.forEach((r) => result.get(r.serviceId)?.push(r.providerId));
    return result;
  }

  async setProvidersOfService(serviceId: string, providerIds: readonly string[]): Promise<void> {
    await this.repo.delete({ serviceId });
    const unique = [...new Set(providerIds)];
    if (unique.length)
      await this.repo.insert(unique.map((providerId) => ({ providerId, serviceId })));
  }

  async setServicesOfProvider(providerId: string, serviceIds: readonly string[]): Promise<void> {
    await this.repo.delete({ providerId });
    const unique = [...new Set(serviceIds)];
    if (unique.length)
      await this.repo.insert(unique.map((serviceId) => ({ providerId, serviceId })));
  }
}

@Injectable()
export class TypeOrmProviderDirectory extends ProviderDirectory {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  async summariesOf(ids: readonly string[]): Promise<ProviderSummary[]> {
    if (ids.length === 0) return [];
    const rows = await this.ctx
      .repository(ProviderOrmEntity)
      .find({ where: { id: In([...new Set(ids)]) }, order: { displayName: 'ASC' } });
    return rows.map((r) => ({
      id: r.id,
      displayName: r.displayName,
      specialty: r.specialty,
      avatarUrl: r.avatarUrl,
      isActive: r.isActive,
    }));
  }
}
