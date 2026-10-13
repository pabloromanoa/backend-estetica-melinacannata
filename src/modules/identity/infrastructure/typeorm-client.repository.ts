import { Injectable } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { Client } from '../domain/client';
import { ClientRepository } from '../domain/client.repository';
import { ClientOrmEntity } from './client.orm-entity';

@Injectable()
export class TypeOrmClientRepository extends ClientRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(ClientOrmEntity);
  }

  async findById(id: string): Promise<Client | null> {
    return toDomain(await this.repo.findOneBy({ id }));
  }

  async findByDni(dni: string): Promise<Client | null> {
    return toDomain(await this.repo.findOneBy({ dni }));
  }

  async findByUserId(userId: string): Promise<Client | null> {
    return toDomain(await this.repo.findOneBy({ userId }));
  }

  async search(term: string, limit: number): Promise<Client[]> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.lastName').addOrderBy('c.firstName');
    if (term) {
      const like = `%${term}%`;
      qb.where(
        new Brackets((w) =>
          w
            .where("CONCAT(c.first_name, ' ', c.last_name) LIKE :like", { like })
            .orWhere("CONCAT(c.last_name, ' ', c.first_name) LIKE :like", { like })
            .orWhere('c.dni LIKE :like', { like })
            .orWhere('c.phone LIKE :like', { like }),
        ),
      );
    }
    const rows = await qb.take(limit).getMany();
    return rows.map((r) => toDomain(r)!);
  }

  async save(client: Client): Promise<void> {
    await this.repo.save(this.repo.create(client));
  }

  async countAppointments(clientId: string): Promise<number> {
    const [row] = await this.ctx.manager.query<{ total: string | number }[]>(
      'SELECT COUNT(*) AS total FROM appointments WHERE client_id = ?',
      [clientId],
    );
    return Number(row?.total ?? 0);
  }
}

function toDomain(row: ClientOrmEntity | null): Client | null {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    dni: row.dni,
    phone: row.phone,
    email: row.email,
  };
}
