import { Injectable } from '@nestjs/common';
import { Role } from '../../../shared/domain/role';
import { TransactionContext } from '../../../shared/infrastructure/persistence/transaction-context';
import { User } from '../domain/user';
import { LinkedProfiles, UserRepository } from '../domain/user.repository';
import { UserOrmEntity } from './user.orm-entity';

@Injectable()
export class TypeOrmUserRepository extends UserRepository {
  constructor(private readonly ctx: TransactionContext) {
    super();
  }

  private get repo() {
    return this.ctx.repository(UserOrmEntity);
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.repo.findOneBy({ email });
    return row ? toDomain(row) : null;
  }

  async existsWithRole(role: Role): Promise<boolean> {
    const count = await this.repo
      .createQueryBuilder('u')
      .where('FIND_IN_SET(:role, u.roles) > 0', { role })
      .getCount();
    return count > 0;
  }

  async save(user: User): Promise<void> {
    await this.repo.save(this.repo.create({ ...user, roles: [...user.roles] }));
  }

  async findLinkedProfiles(userId: string): Promise<LinkedProfiles> {
    const [provider] = await this.ctx.manager.query<{ id: string }[]>(
      'SELECT id FROM providers WHERE user_id = ? LIMIT 1',
      [userId],
    );
    const [client] = await this.ctx.manager.query<{ id: string }[]>(
      'SELECT id FROM clients WHERE user_id = ? LIMIT 1',
      [userId],
    );
    return { providerId: provider?.id ?? null, clientId: client?.id ?? null };
  }
}

function toDomain(row: UserOrmEntity): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
    roles: row.roles.filter(Boolean),
    isActive: row.isActive,
  };
}
