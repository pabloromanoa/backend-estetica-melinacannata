import { Column, Entity } from 'typeorm';
import { BaseOrmEntity } from '../../../shared/infrastructure/persistence/base.orm-entity';
import { Role } from '../../../shared/domain/role';

@Entity('users')
export class UserOrmEntity extends BaseOrmEntity {
  @Column({ length: 190, unique: true })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  /** Lista separada por comas (ej. "PROVIDER,ADMIN"). */
  @Column('simple-array')
  roles: Role[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
