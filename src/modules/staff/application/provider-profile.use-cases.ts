import { Injectable } from '@nestjs/common';
import { UnitOfWork } from '../../../shared/application/unit-of-work';
import {
  ConflictError,
  InvalidInputError,
  NotFoundError,
} from '../../../shared/domain/domain-error';
import { IdGenerator } from '../../../shared/domain/id-generator';
import { Role } from '../../../shared/domain/role';
import { PasswordHasher } from '../../identity/domain/security.ports';
import { normalizeEmail } from '../../identity/domain/user';
import { UserRepository } from '../../identity/domain/user.repository';
import {
  ProviderAssignmentRepository,
  ServiceRepository,
} from '../../catalog/domain/catalog.repositories';
import { BankDetails, EMPTY_BANK_DETAILS, Provider } from '../domain/provider';
import { ProviderRepository } from '../domain/staff.repositories';

export interface ProviderView extends Provider {
  email: string;
  serviceIds: string[];
}

export interface CreateProviderCommand {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  displayName: string;
  specialty?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface UpdateProviderCommand {
  displayName: string;
  specialty?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isActive: boolean;
}

const clean = (value: string | null | undefined): string | null => value?.trim() || null;

/** Perfil del prestador: datos públicos, datos bancarios para la seña y servicios que realiza. */
@Injectable()
export class ProviderProfileUseCases {
  constructor(
    private readonly providers: ProviderRepository,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly services: ServiceRepository,
    private readonly assignments: ProviderAssignmentRepository,
    private readonly ids: IdGenerator,
    private readonly uow: UnitOfWork,
  ) {}

  async get(providerId: string): Promise<ProviderView> {
    const provider = await this.require(providerId);
    const [user, serviceIds] = await Promise.all([
      this.users.findById(provider.userId),
      this.assignments.serviceIdsOf(providerId),
    ]);
    return { ...provider, email: user?.email ?? '', serviceIds };
  }

  async list(includeInactive: boolean): Promise<ProviderView[]> {
    const providers = await this.providers.list({ includeInactive });
    return Promise.all(providers.map((p) => this.get(p.id)));
  }

  async create(command: CreateProviderCommand): Promise<ProviderView> {
    const email = normalizeEmail(command.email);
    const passwordHash = await this.hasher.hash(command.password);
    const providerId = this.ids.next();
    await this.uow.run(async () => {
      if (await this.users.findByEmail(email)) {
        throw new ConflictError('EMAIL_ALREADY_REGISTERED', 'Ya existe una cuenta con ese email');
      }
      const userId = this.ids.next();
      // El rol ADMIN nunca se asigna desde la API: sólo PROVIDER.
      await this.users.save({
        id: userId,
        email,
        passwordHash,
        firstName: command.firstName.trim(),
        lastName: command.lastName.trim(),
        roles: [Role.PROVIDER],
        isActive: true,
      });
      await this.providers.save({
        id: providerId,
        userId,
        displayName: command.displayName.trim(),
        specialty: clean(command.specialty),
        bio: clean(command.bio),
        avatarUrl: clean(command.avatarUrl),
        isActive: true,
        bankDetails: { ...EMPTY_BANK_DETAILS },
      });
    });
    return this.get(providerId);
  }

  async update(providerId: string, command: UpdateProviderCommand): Promise<ProviderView> {
    const provider = await this.require(providerId);
    await this.providers.save({
      ...provider,
      displayName: command.displayName.trim(),
      specialty: clean(command.specialty),
      bio: clean(command.bio),
      avatarUrl: clean(command.avatarUrl),
      isActive: command.isActive,
    });
    return this.get(providerId);
  }

  async updateBankDetails(providerId: string, details: BankDetails): Promise<ProviderView> {
    const provider = await this.require(providerId);
    const cbu = clean(details.cbu)?.replace(/\s/g, '') ?? null;
    if (cbu && !/^\d{22}$/.test(cbu))
      throw new InvalidInputError('El CBU/CVU debe tener 22 dígitos');
    await this.providers.save({
      ...provider,
      bankDetails: {
        alias: clean(details.alias)?.toUpperCase() ?? null,
        cbu,
        holder: clean(details.holder),
        cuil: clean(details.cuil),
        bankName: clean(details.bankName),
      },
    });
    return this.get(providerId);
  }

  async setServices(providerId: string, serviceIds: string[]): Promise<ProviderView> {
    await this.require(providerId);
    const unique = [...new Set(serviceIds)];
    const found = await this.services.findByIds(unique);
    const missing = unique.find((id) => !found.some((s) => s.id === id));
    if (missing) throw new InvalidInputError(`Servicio inexistente: ${missing}`);
    await this.assignments.setServicesOfProvider(providerId, unique);
    return this.get(providerId);
  }

  private async require(providerId: string): Promise<Provider> {
    const provider = await this.providers.findById(providerId);
    if (!provider) throw new NotFoundError('Prestador', providerId);
    return provider;
  }
}
