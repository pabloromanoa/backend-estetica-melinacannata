import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { ForbiddenError } from '../../../shared/domain/domain-error';
import { Actor, isAdmin } from '../../../shared/domain/role';
import { SlotNotAvailableError } from '../domain/scheduling.errors';
import { AppointmentRepository } from '../domain/scheduling.ports';
import { ProviderRepository } from '../../staff/domain/staff.repositories';
import { AppointmentAccess } from './appointment-access.policy';
import { AppointmentLocator } from './appointment-locator.service';
import { AppointmentNotices } from './appointment-notices';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';
import { AvailabilityService } from './availability.service';

export interface RescheduleCommand {
  appointmentId: string;
  startAt: Date;
  providerId?: string;
  reason: string;
}

/**
 * Reprogramación realizada por el personal (el cliente no puede hacerlo solo).
 * El nuevo horario se revalida con el motor, excluyendo el propio turno.
 */
@Injectable()
export class RescheduleAppointmentUseCase {
  constructor(
    private readonly locator: AppointmentLocator,
    private readonly appointments: AppointmentRepository,
    private readonly providers: ProviderRepository,
    private readonly availability: AvailabilityService,
    private readonly views: AppointmentViews,
    private readonly notices: AppointmentNotices,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(command: RescheduleCommand, actor: Actor): Promise<AppointmentView> {
    const current = await this.locator.byId(command.appointmentId);
    AppointmentAccess.assertStaff(actor, current);
    const targetProviderId = command.providerId ?? current.providerId;
    if (!isAdmin(actor) && targetProviderId !== actor.providerId) {
      throw new ForbiddenError('Sólo un administrador puede pasar el turno a otro prestador');
    }
    const service = await this.availability.getBookableService(current.snapshot().serviceId);
    await this.availability.candidateProviders(service, targetProviderId);

    await this.uow.run(async () => {
      await this.providers.lockForBooking([targetProviderId]);
      const appointment = await this.locator.byId(command.appointmentId);
      const free = await this.availability.providersFreeAt({
        service,
        providerIds: [targetProviderId],
        startAt: command.startAt,
        excludeAppointmentId: appointment.id,
      });
      if (free.length === 0) throw new SlotNotAvailableError();
      appointment.reschedule(
        {
          providerId: targetProviderId,
          startAt: command.startAt,
          durationMinutes: service.durationMinutes,
          prepMinutes: service.prepMinutes,
          cleanupMinutes: service.cleanupMinutes,
        },
        command.reason,
      );
      await this.appointments.save(appointment);
    });

    const view = await this.views.get(command.appointmentId);
    await this.notices.rescheduled(view, command.reason.trim());
    return view;
  }
}
