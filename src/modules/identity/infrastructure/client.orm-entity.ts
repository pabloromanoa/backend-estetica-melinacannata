import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../shared/infrastructure/persistence/base.orm-entity';
import { UserOrmEntity } from './user.orm-entity';

@Entity('clients')
export class ClientOrmEntity extends BaseOrmEntity {
  @Column({ name: 'user_id', type: 'char', length: 36, nullable: true })
  userId: string | null;

  @OneToOne(() => UserOrmEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity | null;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Index()
  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 20, unique: true })
  dni: string;

  @Index()
  @Column({ length: 40 })
  phone: string;

  @Column({ type: 'varchar', length: 190, nullable: true })
  email: string | null;
}
