import { Injectable } from '@nestjs/common';
import { Actor } from '../../../shared/domain/role';
import { AppointmentRepository } from '../domain/scheduling.ports';
import { AppointmentAccess } from './appointment-access.policy';
import { AppointmentLocator } from './appointment-locator.service';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';

@Injectable()
export class FinishAppointmentUseCase {
  constructor(
    private readonly locator: AppointmentLocator,
    private readonly appointments: AppointmentRepository,
    private readonly views: AppointmentViews,
  ) {}

  async execute(appointmentId: string, actor: Actor): Promise<AppointmentView> {
    const appointment = await this.locator.byId(appointmentId);
    AppointmentAccess.assertStaff(actor, appointment);
    appointment.finish();
    await this.appointments.save(appointment);
    return this.views.get(appointmentId);
  }
}
