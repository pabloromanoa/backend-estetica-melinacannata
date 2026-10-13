import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../shared/domain/domain-error';
import { Actor } from '../../../shared/domain/role';
import { Appointment } from '../domain/appointment';
import { AppointmentRepository, GuestTokenService } from '../domain/scheduling.ports';
import { AppointmentAccess } from './appointment-access.policy';

/** Cómo se identifica quien opera sobre un turno: sesión o enlace privado de invitado. */
export type AppointmentRef =
  { kind: 'session'; appointmentId: string; actor: Actor } | { kind: 'guest'; token: string };

/** Obtiene el agregado verificando que quien lo pide tenga acceso. */
@Injectable()
export class AppointmentLocator {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly tokens: GuestTokenService,
  ) {}

  async byId(id: string): Promise<Appointment> {
    const appointment = await this.appointments.findById(id);
    if (!appointment) throw new NotFoundError('Turno', id);
    return appointment;
  }

  /** Resuelve el turno y valida acceso de lectura (dueño, staff o token de invitado). */
  async resolve(ref: AppointmentRef): Promise<Appointment> {
    if (ref.kind === 'guest') {
      const appointment = await this.appointments.findByGuestTokenHash(this.tokens.hash(ref.token));
      // Mismo error que "no existe" para no revelar si el token fue válido alguna vez.
      if (!appointment) throw new NotFoundError('Turno');
      return appointment;
    }
    const appointment = await this.byId(ref.appointmentId);
    AppointmentAccess.assertCanView(ref.actor, appointment);
    return appointment;
  }
}
