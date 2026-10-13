import { Column, Entity, Index } from 'typeorm';
import {
  BaseOrmEntity,
  decimalTransformer,
} from '../../../shared/infrastructure/persistence/base.orm-entity';

@Entity('recommendations')
export class RecommendationOrmEntity extends BaseOrmEntity {
  @Index()
  @Column({ name: 'client_id', type: 'char', length: 36, nullable: true })
  clientId: string | null;

  @Column({ type: 'simple-json' })
  answers: Record<string, string>;

  @Column({ type: 'enum', enum: ['SERVICE', 'TREATMENT'] })
  type: 'SERVICE' | 'TREATMENT';

  @Column({ name: 'service_id', type: 'char', length: 36, nullable: true })
  serviceId: string | null;

  @Column({ name: 'treatment_id', type: 'char', length: 36, nullable: true })
  treatmentId: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 3, transformer: decimalTransformer })
  confidence: number;

  @Column({ type: 'enum', enum: ['LAYA', 'RULES'] })
  source: 'LAYA' | 'RULES';

  @Column({ type: 'enum', enum: ['PENDING', 'ACCEPTED', 'DISCARDED'], default: 'PENDING' })
  outcome: 'PENDING' | 'ACCEPTED' | 'DISCARDED';

  @Column({ name: 'led_to_booking', default: false })
  ledToBooking: boolean;
}
