import { InvalidStatusTransitionError, ReasonRequiredError } from './scheduling.errors';

export enum DepositStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface DepositProps {
  id: string;
  appointmentId: string;
  amount: number;
  status: DepositStatus;
  /** Nombre interno del archivo en el almacenamiento privado (nunca el nombre del usuario). */
  receiptKey: string;
  receiptSizeBytes: number;
  uploadedAt: Date;
  reviewedAt: Date | null;
  reviewedByUserId: string | null;
  rejectionReason: string | null;
}

/** Seña informada mediante comprobante. La transferencia ocurre fuera del sistema. */
export class Deposit {
  private constructor(private props: DepositProps) {}

  static inform(input: {
    id: string;
    appointmentId: string;
    amount: number;
    receiptKey: string;
    receiptSizeBytes: number;
    now: Date;
  }): Deposit {
    return new Deposit({
      id: input.id,
      appointmentId: input.appointmentId,
      amount: input.amount,
      status: DepositStatus.PENDING,
      receiptKey: input.receiptKey,
      receiptSizeBytes: input.receiptSizeBytes,
      uploadedAt: input.now,
      reviewedAt: null,
      reviewedByUserId: null,
      rejectionReason: null,
    });
  }

  static restore(props: DepositProps): Deposit {
    return new Deposit({ ...props });
  }

  get id(): string {
    return this.props.id;
  }
  get appointmentId(): string {
    return this.props.appointmentId;
  }
  get receiptKey(): string {
    return this.props.receiptKey;
  }
  get status(): DepositStatus {
    return this.props.status;
  }

  snapshot(): Readonly<DepositProps> {
    return { ...this.props };
  }

  verify(reviewerId: string, now: Date): void {
    this.assertPending('verificar');
    Object.assign(this.props, {
      status: DepositStatus.VERIFIED,
      reviewedAt: now,
      reviewedByUserId: reviewerId,
    });
  }

  reject(reviewerId: string, reason: string, now: Date): void {
    this.assertPending('rechazar');
    if (!reason.trim()) throw new ReasonRequiredError('rechazar la seña');
    Object.assign(this.props, {
      status: DepositStatus.REJECTED,
      reviewedAt: now,
      reviewedByUserId: reviewerId,
      rejectionReason: reason.trim(),
    });
  }

  private assertPending(action: string): void {
    if (this.props.status !== DepositStatus.PENDING) {
      throw new InvalidStatusTransitionError(`${action} la seña de`, this.props.status);
    }
  }
}
