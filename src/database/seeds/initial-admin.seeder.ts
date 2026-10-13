import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AppConfig } from '../../config/app-config';
import { UnitOfWork } from '../../shared/application/unit-of-work';
import { IdGenerator } from '../../shared/domain/id-generator';
import { Role } from '../../shared/domain/role';
import { PasswordHasher } from '../../modules/identity/domain/security.ports';
import { normalizeEmail } from '../../modules/identity/domain/user';
import { UserRepository } from '../../modules/identity/domain/user.repository';
import { EMPTY_BANK_DETAILS } from '../../modules/staff/domain/provider';
import { ProviderRepository } from '../../modules/staff/domain/staff.repositories';

/**
 * Seeder IDEMPOTENTE del administrador inicial (sección "Creación del administrador"):
 * - si ya existe al menos un ADMIN, no hace nada;
 * - si no, crea la cuenta con las credenciales de ADMIN_EMAIL / ADMIN_PASSWORD.
 * No existe ninguna otra forma de crear administradores desde la API.
 */
@Injectable()
export class InitialAdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(InitialAdminSeeder.name);

  constructor(
    private readonly config: AppConfig,
    private readonly users: UserRepository,
    private readonly providers: ProviderRepository,
    private readonly hasher: PasswordHasher,
    private readonly ids: IdGenerator,
    private readonly uow: UnitOfWork,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.run();
  }

  async run(): Promise<boolean> {
    if (await this.users.existsWithRole(Role.ADMIN)) return false;
    const admin = this.config.initialAdmin;
    const passwordHash = await this.hasher.hash(admin.password);
    await this.uow.run(async () => {
      const userId = await this.upsertAdminUser(passwordHash);
      // La dueña administra y también atiende: se le crea perfil de prestadora.
      if (admin.isProvider) await this.ensureProviderProfile(userId);
    });
    this.logger.log(`Administrador inicial creado: ${normalizeEmail(admin.email)}`);
    return true;
  }

  /** Crea la cuenta o, si el email ya existía, le agrega el rol ADMIN conservando sus datos. */
  private async upsertAdminUser(passwordHash: string): Promise<string> {
    const admin = this.config.initialAdmin;
    const email = normalizeEmail(admin.email);
    const existing = await this.users.findByEmail(email);
    const roles = new Set<Role>([...(existing?.roles ?? []), Role.ADMIN]);
    if (admin.isProvider) roles.add(Role.PROVIDER);
    const user = existing ?? {
      id: this.ids.next(),
      email,
      passwordHash,
      firstName: admin.firstName,
      lastName: admin.lastName,
      roles: [],
      isActive: true,
    };
    await this.users.save({ ...user, roles: [...roles], isActive: true });
    return user.id;
  }

  private async ensureProviderProfile(userId: string): Promise<void> {
    if (await this.providers.findByUserId(userId)) return;
    const admin = this.config.initialAdmin;
    await this.providers.save({
      id: this.ids.next(),
      userId,
      displayName: `${admin.firstName} ${admin.lastName}`,
      specialty: null,
      bio: null,
      avatarUrl: null,
      isActive: true,
      bankDetails: { ...EMPTY_BANK_DETAILS },
    });
  }
}
