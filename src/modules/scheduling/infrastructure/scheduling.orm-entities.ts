import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import {
  BaseOrmEntity,
  decimalTransformer,
} from '../../../shared/infrastructure/persistence/base.orm-entity';
import { ServiceOrmEntity } from '../../catalog/infrastructure/catalog.orm-entities';
import { ClientOrmEntity } from '../../identity/infrastructure/client.orm-entity';
import { ProviderOrmEntity } from '../../staff/infrastructure/staff.orm-entities';
import { AppointmentStatus, CancelledBy, DepositOutcome } from '../domain/appointment-status';
import { DepositStatus } from '../domain/deposit';

const datetime = { type: 'datetime', precision: 3 } as const;

@Entity('appointments')
@Index(['providerId', 'blockedFrom', 'blockedUntil'])
@Index(['status', 'holdExpiresAt'])
@Index(['status', 'startAt'])
export class AppointmentOrmEntity extends BaseOrmEntity {
  @Column({ length: 12, unique: true })
  code: string;

  @Index()
  @Column({ name: 'client_id', type: 'char', length: 36 })
  clientId: string;

  @ManyToOne(() => ClientOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'client_id' })
  client?: ClientOrmEntity;

  @Column({ name: 'provider_id', type: 'char', length: 36 })
  providerId: string;

  @ManyToOne(() => ProviderOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'provider_id' })
  provider?: ProviderOrmEntity;

  @Column({ name: 'service_id', type: 'char', length: 36 })
  serviceId: string;

  @ManyToOne(() => ServiceOrmEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_id' })
  service?: ServiceOrmEntity;

  @Column({ name: 'start_at', ...datetime })
  startAt: Date;

  @Column({ name: 'end_at', ...datetime })
  endAt: Date;

  @Column({ name: 'blocked_from', ...datetime })
  blockedFrom: Date;

  @Column({ name: 'blocked_until', ...datetime })
  blockedUntil: Date;

  @Column({ type: 'enum', enum: AppointmentStatus })
  status: AppointmentStatus;

  @Column({ name: 'hold_expires_at', ...datetime, nullable: true })
  holdExpiresAt: Date | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  price: number;

  @Column({
    name: 'deposit_amount',
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
  })
  depositAmount: number;

  @Column({ name: 'guest_token_hash', type: 'char', length: 64, nullable: true, unique: true })
  guestTokenHash: string | null;

  @Column({ name: 'created_by_staff', default: false })
  createdByStaff: boolean;

  @Column({ default: false })
  rescheduled: boolean;

  @Column({ name: 'reschedule_reason', type: 'varchar', length: 500, nullable: true })
  rescheduleReason: string | null;

  @Column({ name: 'cancellation_reason', type: 'varchar', length: 500, nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'cancelled_by', type: 'enum', enum: CancelledBy, nullable: true })
  cancelledBy: CancelledBy | null;

  @Column({ name: 'deposit_outcome', type: 'enum', enum: DepositOutcome, nullable: true })
  depositOutcome: DepositOutcome | null;

  @Column({ name: 'cancelled_at', ...datetime, nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'recommendation_id', type: 'char', length: 36, nullable: true })
  recommendationId: string | null;

  @Column({ name: 'reminder_sent_at', ...datetime, nullable: true })
  reminderSentAt: Date | null;

  @OneToMany(() => DepositOrmEntity, (d) => d.appointment)
  deposits?: DepositOrmEntity[];
}

@Entity('deposits')
@Index(['status', 'uploadedAt'])
export class DepositOrmEntity extends BaseOrmEntity {
  @Index()
  @Column({ name: 'appointment_id', type: 'char', length: 36 })
  appointmentId: string;

  @ManyToOne(() => AppointmentOrmEntity, (a) => a.deposits, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment?: AppointmentOrmEntity;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: decimalTransformer })
  amount: number;

  @Column({ type: 'enum', enum: DepositStatus, default: DepositStatus.PENDING })
  status: DepositStatus;

  @Column({ name: 'receipt_key', length: 80 })
  receiptKey: string;

  @Column({ name: 'receipt_size_bytes', type: 'int', unsigned: true })
  receiptSizeBytes: number;

  @Column({ name: 'uploaded_at', ...datetime })
  uploadedAt: Date;

  @Column({ name: 'reviewed_at', ...datetime, nullable: true })
  reviewedAt: Date | null;

  @Column({ name: 'reviewed_by_user_id', type: 'char', length: 36, nullable: true })
  reviewedByUserId: string | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason: string | null;
}
