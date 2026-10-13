import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseOrmEntity } from '../../../shared/infrastructure/persistence/base.orm-entity';
import { UserOrmEntity } from '../../identity/infrastructure/user.orm-entity';
import { ExceptionType } from '../domain/availability';

@Entity('providers')
export class ProviderOrmEntity extends BaseOrmEntity {
  @Column({ name: 'user_id', type: 'char', length: 36 })
  userId: string;

  @OneToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserOrmEntity;

  @Column({ name: 'display_name', length: 120 })
  displayName: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  specialty: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'bank_alias', type: 'varchar', length: 60, nullable: true })
  bankAlias: string | null;

  @Column({ name: 'bank_cbu', type: 'varchar', length: 30, nullable: true })
  bankCbu: string | null;

  @Column({ name: 'bank_holder', type: 'varchar', length: 120, nullable: true })
  bankHolder: string | null;

  @Column({ name: 'bank_cuil', type: 'varchar', length: 20, nullable: true })
  bankCuil: string | null;

  @Column({ name: 'bank_name', type: 'varchar', length: 80, nullable: true })
  bankName: string | null;
}

@Entity('weekly_availability')
@Index(['providerId', 'dayOfWeek'])
export class WeeklyAvailabilityOrmEntity extends BaseOrmEntity {
  @Column({ name: 'provider_id', type: 'char', length: 36 })
  providerId: string;

  @ManyToOne(() => ProviderOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider?: ProviderOrmEntity;

  @Column({ name: 'day_of_week', type: 'tinyint' })
  dayOfWeek: number;

  @Column({ name: 'start_time', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', length: 5 })
  endTime: string;
}

@Entity('availability_exceptions')
@Index(['providerId', 'date'])
export class AvailabilityExceptionOrmEntity extends BaseOrmEntity {
  @Column({ name: 'provider_id', type: 'char', length: 36 })
  providerId: string;

  @ManyToOne(() => ProviderOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider?: ProviderOrmEntity;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'enum', enum: ExceptionType })
  type: ExceptionType;

  @Column({ name: 'start_time', type: 'varchar', length: 5, nullable: true })
  startTime: string | null;

  @Column({ name: 'end_time', type: 'varchar', length: 5, nullable: true })
  endTime: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string | null;
}
