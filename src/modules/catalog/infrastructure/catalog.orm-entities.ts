import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import {
  BaseOrmEntity,
  decimalTransformer,
} from '../../../shared/infrastructure/persistence/base.orm-entity';
import { ProviderOrmEntity } from '../../staff/infrastructure/staff.orm-entities';

@Entity('categories')
export class CategoryOrmEntity extends BaseOrmEntity {
  @Column({ length: 100, unique: true })
  name: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}

@Entity('services')
export class ServiceOrmEntity extends BaseOrmEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'duration_minutes', type: 'smallint', unsigned: true })
  durationMinutes: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  price: number;

  @Column({ name: 'prep_minutes', type: 'smallint', unsigned: true, default: 0 })
  prepMinutes: number;

  @Column({ name: 'cleanup_minutes', type: 'smallint', unsigned: true, default: 0 })
  cleanupMinutes: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'recommendation_tags', type: 'simple-json' })
  recommendationTags: string[];

  @ManyToMany(() => CategoryOrmEntity, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'service_categories',
    joinColumn: { name: 'service_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'category_id', referencedColumnName: 'id' },
  })
  categories: CategoryOrmEntity[];

  @OneToMany(() => ServiceDateOrmEntity, (d) => d.service, { cascade: true })
  dates: ServiceDateOrmEntity[];

  @OneToMany(() => ProviderServiceOrmEntity, (ps) => ps.service)
  providerLinks?: ProviderServiceOrmEntity[];
}

@Entity('service_dates')
export class ServiceDateOrmEntity {
  @PrimaryColumn({ name: 'service_id', type: 'char', length: 36 })
  serviceId: string;

  @PrimaryColumn({ type: 'date' })
  date: string;

  @ManyToOne(() => ServiceOrmEntity, (s) => s.dates, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceOrmEntity;
}

@Entity('provider_services')
export class ProviderServiceOrmEntity {
  @PrimaryColumn({ name: 'provider_id', type: 'char', length: 36 })
  providerId: string;

  @PrimaryColumn({ name: 'service_id', type: 'char', length: 36 })
  serviceId: string;

  @ManyToOne(() => ProviderOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider?: ProviderOrmEntity;

  @ManyToOne(() => ServiceOrmEntity, (s) => s.providerLinks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceOrmEntity;
}

@Entity('treatments')
export class TreatmentOrmEntity extends BaseOrmEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'recommendation_tags', type: 'simple-json' })
  recommendationTags: string[];

  @OneToMany(() => TreatmentServiceOrmEntity, (ts) => ts.treatment, { cascade: true })
  steps: TreatmentServiceOrmEntity[];
}

@Entity('treatment_services')
export class TreatmentServiceOrmEntity {
  @PrimaryColumn({ name: 'treatment_id', type: 'char', length: 36 })
  treatmentId: string;

  @PrimaryColumn({ type: 'smallint', unsigned: true })
  position: number;

  @Column({ name: 'service_id', type: 'char', length: 36 })
  serviceId: string;

  @ManyToOne(() => TreatmentOrmEntity, (t) => t.steps, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn({ name: 'treatment_id' })
  treatment?: TreatmentOrmEntity;

  @ManyToOne(() => ServiceOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceOrmEntity;
}
