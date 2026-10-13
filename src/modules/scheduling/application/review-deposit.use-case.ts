import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { Clock } from '../../../shared/domain/clock';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Actor } from '../../../shared/domain/role';
import { Appointment } from '../domain/appointment';
import { Deposit } from '../domain/deposit';
import {
  AppointmentRepository,
  DepositRepository,
  ReceiptStorage,
} from '../domain/scheduling.ports';
import { AppointmentAccess } from './appointment-access.policy';
import { AppointmentLocator } from './appointment-locator.service';
import { AppointmentNotices } from './appointment-notices';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';

/**
 * Revisión del comprobante por el prestador asignado o un administrador.
 * - Verificar: seña VERIFIED, turno DEPOSIT_PAID ("señado").
 * - Rechazar: seña REJECTED, turno EXPIRED y el horario se libera.
 */
@Injectable()
export class ReviewDepositUseCase {
  constructor(
    private readonly deposits: DepositRepository,
    private readonly appointments: AppointmentRepository,
    private readonly locator: AppointmentLocator,
    private readonly storage: ReceiptStorage,
    private readonly views: AppointmentViews,
    private readonly notices: AppointmentNotices,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
  ) {}

  async verify(depositId: string, actor: Actor): Promise<AppointmentView> {
    const view = await this.review(depositId, actor, (deposit, appointment, now) => {
      deposit.verify(actor.userId, now);
      appointment.confirmDeposit();
    });
    await this.notices.depositConfirmed(view);
    return view;
  }

  async reject(depositId: string, reason: string, actor: Actor): Promise<AppointmentView> {
    const view = await this.review(depositId, actor, (deposit, appointment, now) => {
      deposit.reject(actor.userId, reason, now);
      appointment.rejectDeposit();
    });
    await this.notices.depositRejected(view, reason.trim());
    return view;
  }

  /** Contenido del comprobante, sólo para el prestador asignado o un admin. */
  async receipt(depositId: string, actor: Actor): Promise<Buffer> {
    const deposit = await this.requireDeposit(depositId);
    const appointment = await this.locator.byId(deposit.appointmentId);
    AppointmentAccess.assertStaff(actor, appointment);
    return this.storage.read(deposit.receiptKey);
  }

  private async review(
    depositId: string,
    actor: Actor,
    apply: (deposit: Deposit, appointment: Appointment, now: Date) => void,
  ): Promise<AppointmentView> {
    const appointmentId = await this.uow.run(async () => {
      const deposit = await this.requireDeposit(depositId);
      const appointment = await this.locator.byId(deposit.appointmentId);
      AppointmentAccess.assertStaff(actor, appointment);
      apply(deposit, appointment, this.clock.now());
      await this.deposits.save(deposit);
      await this.appointments.save(appointment);
      return appointment.id;
    });
    return this.views.get(appointmentId);
  }

  private async requireDeposit(id: string): Promise<Deposit> {
    const deposit = await this.deposits.findById(id);
    if (!deposit) throw new NotFoundError('Seña', id);
    return deposit;
  }
}
