import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { Provider } from '../domain/provider';
import { ProviderRepository } from '../domain/staff.repositories';
import { ProviderOrmEntity } from './staff.orm-entities';

@Injectable()
export class TypeOrmProviderRepository extends ProviderRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(ProviderOrmEntity);
  }

  async findById(id: string): Promise<Provider | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async findByUserId(userId: string): Promise<Provider | null> {
    const row = await this.repo.findOneBy({ userId });
    return row ? toDomain(row) : null;
  }

  async findByIds(ids: readonly string[]): Promise<Provider[]> {
    if (ids.length === 0) return [];
    const rows = await this.repo.findBy({ id: In([...ids]) });
    return rows.map(toDomain);
  }

  async list({ includeInactive }: { includeInactive: boolean }): Promise<Provider[]> {
    const rows = await this.repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { displayName: 'ASC' },
    });
    return rows.map(toDomain);
  }

  async save(provider: Provider): Promise<void> {
    const { bankDetails: b, ...rest } = provider;
    await this.repo.save(
      this.repo.create({
        ...rest,
        bankAlias: b.alias,
        bankCbu: b.cbu,
        bankHolder: b.holder,
        bankCuil: b.cuil,
        bankName: b.bankName,
      }),
    );
  }

  async lockForBooking(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    // Orden determinístico para evitar deadlocks entre transacciones concurrentes.
    const sorted = [...new Set(ids)].sort();
    await this.repo
      .createQueryBuilder('p')
      .setLock('pessimistic_write')
      .where('p.id IN (:...ids)', { ids: sorted })
      .orderBy('p.id')
      .getMany();
  }
}

export function toDomain(row: ProviderOrmEntity): Provider {
  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    specialty: row.specialty,
    bio: row.bio,
    avatarUrl: row.avatarUrl,
    isActive: row.isActive,
    bankDetails: {
      alias: row.bankAlias,
      cbu: row.bankCbu,
      holder: row.bankHolder,
      cuil: row.bankCuil,
      bankName: row.bankName,
    },
  };
}
