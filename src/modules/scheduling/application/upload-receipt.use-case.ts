import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { Clock } from '../../../shared/domain/clock';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Deposit } from '../domain/deposit';
import { assertValidReceipt, ReceiptPolicy, UploadedReceipt } from '../domain/receipt-file';
import {
  AppointmentRepository,
  DepositRepository,
  ReceiptStorage,
} from '../domain/scheduling.ports';
import { AppointmentLocator, AppointmentRef } from './appointment-locator.service';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';

/**
 * El cliente adjunta el comprobante de la seña dentro del bloqueo temporal.
 * Seña → PENDIENTE, turno → PAYMENT_INFORMED (deja de vencer automáticamente).
 */
@Injectable()
export class UploadReceiptUseCase {
  constructor(
    private readonly locator: AppointmentLocator,
    private readonly appointments: AppointmentRepository,
    private readonly deposits: DepositRepository,
    private readonly storage: ReceiptStorage,
    private readonly views: AppointmentViews,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
    private readonly receipts: ReceiptPolicy,
  ) {}

  async execute(ref: AppointmentRef, file: UploadedReceipt): Promise<AppointmentView> {
    assertValidReceipt(file, this.receipts.maxBytes);
    const appointment = await this.locator.resolve(ref);
    const now = this.clock.now();
    appointment.informPayment(now); // valida estado y vencimiento antes de guardar el archivo

    const key = await this.storage.save(file.content);
    try {
      await this.uow.run(async () => {
        await this.appointments.save(appointment);
        await this.deposits.save(
          Deposit.inform({
            id: this.ids.next(),
            appointmentId: appointment.id,
            amount: appointment.depositAmount,
            receiptKey: key,
            receiptSizeBytes: file.content.length,
            now,
          }),
        );
      });
    } catch (error) {
      await this.storage.remove(key).catch(() => undefined);
      throw error;
    }
    return this.views.get(appointment.id);
  }
}
