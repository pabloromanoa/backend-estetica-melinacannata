import { Injectable, Logger } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { BookingPolicy } from '../../../shared/domain/booking-policy';
import { Clock } from '../../../shared/domain/clock';
import {
  ConflictError,
  ForbiddenError,
  InvalidInputError,
} from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Actor, isAdmin, isStaff, Role } from '../../../shared/domain/role';
import { ClientRegistry } from '../../identity/application/client-registry.service';
import { Client, ClientContactData } from '../../identity/domain/client';
import { RecommendationUseCases } from '../../recommendations/application/recommendation.use-cases';
import { ProviderRepository } from '../../staff/domain/staff.repositories';
import { Appointment } from '../domain/appointment';
import { SlotNotAvailableError } from '../domain/scheduling.errors';
import {
  AppointmentCodeGenerator,
  AppointmentRepository,
  GuestTokenService,
  RandomPicker,
} from '../domain/scheduling.ports';
import { AppointmentNotices } from './appointment-notices';
import { AppointmentViews } from './appointment-views.service';
import { AppointmentView } from './appointment.views';
import { AvailabilityService } from './availability.service';

export interface BookAppointmentCommand {
  serviceId: string;
  startAt: Date;
  providerId?: string;
  /** Datos del paciente: obligatorios para invitados y para reservas cargadas por el personal. */
  guest?: ClientContactData;
  recommendationId?: string;
}

export interface BookAppointmentResult {
  appointment: AppointmentView;
  /** Token del enlace privado (sólo si el cliente no tiene cuenta). Se devuelve una única vez. */
  guestAccessToken: string | null;
}

const MAX_CODE_ATTEMPTS = 10;

/**
 * Reserva de turno (flujo 6 del relevamiento). Pasos:
 * 1. Resuelve el cliente (cuenta, invitado por DNI o paciente cargado por el personal).
 * 2. Dentro de una transacción bloquea a los prestadores candidatos (SELECT … FOR UPDATE)
 *    y revalida la disponibilidad: evita que dos personas tomen el mismo horario.
 * 3. Si no se eligió prestador, asigna uno al azar entre los libres en ese horario exacto.
 * 4. Crea el turno en estado CREATED con bloqueo temporal (5 min por defecto).
 */
@Injectable()
export class BookAppointmentUseCase {
  private readonly logger = new Logger(BookAppointmentUseCase.name);

  constructor(
    private readonly availability: AvailabilityService,
    private readonly appointments: AppointmentRepository,
    private readonly providers: ProviderRepository,
    private readonly clients: ClientRegistry,
    private readonly recommendations: RecommendationUseCases,
    private readonly views: AppointmentViews,
    private readonly notices: AppointmentNotices,
    private readonly tokens: GuestTokenService,
    private readonly random: RandomPicker,
    private readonly codes: AppointmentCodeGenerator,
    private readonly policy: BookingPolicy,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(
    command: BookAppointmentCommand,
    actor: Actor | null,
  ): Promise<BookAppointmentResult> {
    const byStaff = isStaff(actor);
    const providerId = this.resolveProviderScope(command.providerId, actor);
    const client = await this.resolveClient(command, actor, byStaff);
    const service = await this.availability.getBookableService(command.serviceId);
    const candidates = (await this.availability.candidateProviders(service, providerId)).map(
      (p) => p.id,
    );
    if (candidates.length === 0) throw new SlotNotAvailableError();

    const guest = client.userId ? null : this.tokens.generate();
    const now = this.clock.now();

    const appointmentId = await this.uow.run(async () => {
      await this.providers.lockForBooking(candidates);
      const free = await this.availability.providersFreeAt({
        service,
        providerIds: candidates,
        startAt: command.startAt,
      });
      if (free.length === 0) throw new SlotNotAvailableError();

      const appointment = Appointment.create({
        id: this.ids.next(),
        code: await this.newCode(),
        clientId: client.id,
        providerId: providerId ?? this.random.pick(free),
        serviceId: service.id,
        startAt: command.startAt,
        durationMinutes: service.durationMinutes,
        prepMinutes: service.prepMinutes,
        cleanupMinutes: service.cleanupMinutes,
        price: service.price,
        depositAmount: this.policy.depositFor(service.price),
        guestTokenHash: guest?.hash ?? null,
        createdByStaff: byStaff,
        recommendationId: command.recommendationId ?? null,
        holdMinutes: this.policy.holdMinutesFor(byStaff),
        now,
      });
      await this.appointments.save(appointment);
      return appointment.id;
    });

    if (command.recommendationId) {
      await this.recommendations
        .markBooked(command.recommendationId)
        .catch((e) => this.logger.warn(`No se pudo vincular la recomendación: ${String(e)}`));
    }
    const view = await this.views.get(appointmentId);
    await this.notices.bookingCreated(view, guest?.token ?? null);
    return { appointment: view, guestAccessToken: guest?.token ?? null };
  }

  /** Un prestador (que no es admin) sólo puede cargar turnos en su propia agenda. */
  private resolveProviderScope(
    requested: string | undefined,
    actor: Actor | null,
  ): string | undefined {
    if (!actor?.roles.includes(Role.PROVIDER) || isAdmin(actor)) return requested;
    if (requested && requested !== actor.providerId) {
      throw new ForbiddenError('Sólo podés cargar turnos en tu propia agenda');
    }
    return actor.providerId ?? undefined;
  }

  private async resolveClient(
    command: BookAppointmentCommand,
    actor: Actor | null,
    byStaff: boolean,
  ): Promise<Client> {
    if (!byStaff && actor?.clientId) return this.clients.getById(actor.clientId);
    if (!command.guest) {
      throw new InvalidInputError('Completá apellido, nombre, DNI y teléfono para reservar');
    }
    const client = await this.clients.findOrCreateGuest(command.guest);
    if (client.userId && !byStaff) {
      // Evita que un tercero cargue turnos en la cuenta de otra persona sabiendo su DNI.
      throw new ConflictError(
        'LOGIN_REQUIRED',
        'Ese DNI pertenece a una cuenta registrada: iniciá sesión para reservar',
      );
    }
    return client;
  }

  private async newCode(): Promise<string> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = this.codes.next();
      if (!(await this.appointments.codeExists(code))) return code;
    }
    throw new Error('No se pudo generar un código de turno único');
  }
}
