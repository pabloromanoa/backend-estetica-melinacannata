import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import { ConflictError } from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Role } from '../../../shared/domain/role';
import { Client, normalizeDni } from '../domain/client';
import { ClientRepository } from '../domain/client.repository';
import { PasswordHasher } from '../domain/security.ports';
import { normalizeEmail, User } from '../domain/user';
import { UserRepository } from '../domain/user.repository';
import { AuthenticatedSession, buildSession } from './session-user';

export interface RegisterClientCommand {
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
  email: string;
  password: string;
}

export interface RegisterClientResult extends AuthenticatedSession {
  /** Reservas hechas como invitado con el mismo DNI que quedaron vinculadas. */
  linkedAppointments: number;
}

/**
 * Registro voluntario de clientes. Si ya existían reservas como invitado con el mismo DNI,
 * el registro de cliente existente se vincula a la nueva cuenta (regla 2.1 del relevamiento).
 */
@Injectable()
export class RegisterClientUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly clients: ClientRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly uow: UnitOfWork,
  ) {}

  async execute(command: RegisterClientCommand): Promise<RegisterClientResult> {
    const email = normalizeEmail(command.email);
    const dni = normalizeDni(command.dni);
    const passwordHash = await this.hasher.hash(command.password);

    return this.uow.run(async () => {
      if (await this.users.findByEmail(email)) {
        throw new ConflictError('EMAIL_ALREADY_REGISTERED', 'Ya existe una cuenta con ese email');
      }
      const existingClient = await this.clients.findByDni(dni);
      if (existingClient?.userId) {
        throw new ConflictError('DNI_ALREADY_REGISTERED', 'Ya existe una cuenta con ese DNI');
      }

      const user: User = {
        id: this.ids.next(),
        email,
        passwordHash,
        firstName: command.firstName.trim(),
        lastName: command.lastName.trim(),
        roles: [Role.CLIENT],
        isActive: true,
      };
      await this.users.save(user);

      const client: Client = {
        id: existingClient?.id ?? this.ids.next(),
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        dni,
        phone: command.phone.trim(),
        email,
      };
      await this.clients.save(client);

      const linkedAppointments = existingClient
        ? await this.clients.countAppointments(existingClient.id)
        : 0;

      return {
        ...buildSession(user, { providerId: null, clientId: client.id }),
        linkedAppointments,
      };
    });
  }
}
