import { Injectable } from '@nestjs/common';
import { BookingPolicy } from '../../../shared/domain/booking-policy';
import { Clock } from '../../../shared/domain/clock';
import { ForbiddenError } from '../../../shared/domain/domain-error';
import { isAdmin } from '../../../shared/domain/role';
import { Appointment } from '../domain/appointment';
import { CancelledBy } from '../domain/appointment-status';
import { AppointmentRepository } from '../domain/scheduling.ports';
import { AppointmentAccess } from './appointment-access.policy';
import { AppointmentLocator, AppointmentRef } from './appointment-locator.service';
import { AppointmentNotices } from './appointment-notices';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';

/**
 * Cancelación por el cliente (cuenta o enlace de invitado), el prestador asignado o un admin.
 * La política de 24 h decide si corresponde devolver la seña; la devolución es externa.
 */
@Injectable()
export class CancelAppointmentUseCase {
  constructor(
    private readonly locator: AppointmentLocator,
    private readonly appointments: AppointmentRepository,
    private readonly views: AppointmentViews,
    private readonly notices: AppointmentNotices,
    private readonly policy: BookingPolicy,
    private readonly clock: Clock,
  ) {}

  async execute(ref: AppointmentRef, reason: string | null): Promise<AppointmentView> {
    const appointment = await this.locator.resolve(ref);
    const by = this.cancelledBy(ref, appointment);
    appointment.cancel({
      by,
      reason,
      now: this.clock.now(),
      refundWindowHours: this.policy.cancellationRefundHours,
    });
    await this.appointments.save(appointment);
    const view = await this.views.get(appointment.id);
    await this.notices.cancelled(view);
    return view;
  }

  private cancelledBy(ref: AppointmentRef, appointment: Appointment): CancelledBy {
    if (ref.kind === 'guest') return CancelledBy.CLIENT;
    const { actor } = ref;
    if (AppointmentAccess.isOwner(actor, appointment)) return CancelledBy.CLIENT;
    if (isAdmin(actor)) return CancelledBy.ADMIN;
    if (AppointmentAccess.isAssignedProvider(actor, appointment)) return CancelledBy.PROVIDER;
    throw new ForbiddenError();
  }
}
