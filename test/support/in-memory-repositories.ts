/**
 * Repositorios en memoria para tests unitarios de casos de uso (sin base de datos).
 * Implementan los mismos puertos que la infraestructura TypeORM.
 */
import { Role } from '../../src/shared/domain/role';
import { Client } from '../../src/modules/identity/domain/client';
import { ClientRepository } from '../../src/modules/identity/domain/client.repository';
import { PasswordHasher } from '../../src/modules/identity/domain/security.ports';
import { User } from '../../src/modules/identity/domain/user';
import { LinkedProfiles, UserRepository } from '../../src/modules/identity/domain/user.repository';
import { SalonService } from '../../src/modules/catalog/domain/catalog';
import {
  ProviderAssignmentRepository,
  ServiceRepository,
} from '../../src/modules/catalog/domain/catalog.repositories';
import { Provider } from '../../src/modules/staff/domain/provider';
import {
  AvailabilityException,
  WeeklyAvailabilityRange,
} from '../../src/modules/staff/domain/availability';
import {
  AvailabilityRepository,
  ProviderRepository,
  ProviderSchedule,
} from '../../src/modules/staff/domain/staff.repositories';
import { Appointment } from '../../src/modules/scheduling/domain/appointment';
import { AppointmentStatus } from '../../src/modules/scheduling/domain/appointment-status';
import { Deposit } from '../../src/modules/scheduling/domain/deposit';
import {
  AppointmentRepository,
  BlockedRange,
  DepositRepository,
  GuestTokenService,
  OccupancyQuery,
  RandomPicker,
  ReceiptStorage,
} from '../../src/modules/scheduling/domain/scheduling.ports';

export class InMemoryUserRepository extends UserRepository {
  readonly items = new Map<string, User>();
  profiles = new Map<string, LinkedProfiles>();
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByEmail(email: string) {
    return [...this.items.values()].find((u) => u.email === email) ?? null;
  }
  async existsWithRole(role: Role) {
    return [...this.items.values()].some((u) => u.roles.includes(role));
  }
  async save(user: User) {
    this.items.set(user.id, { ...user });
  }
  async findLinkedProfiles(userId: string) {
    return this.profiles.get(userId) ?? { providerId: null, clientId: null };
  }
}

export class InMemoryClientRepository extends ClientRepository {
  readonly items = new Map<string, Client>();
  appointmentCounts = new Map<string, number>();
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByDni(dni: string) {
    return [...this.items.values()].find((c) => c.dni === dni) ?? null;
  }
  async findByUserId(userId: string) {
    return [...this.items.values()].find((c) => c.userId === userId) ?? null;
  }
  async search(term: string) {
    return [...this.items.values()].filter((c) => `${c.firstName} ${c.lastName}`.includes(term));
  }
  async save(client: Client) {
    this.items.set(client.id, { ...client });
  }
  async countAppointments(clientId: string) {
    return this.appointmentCounts.get(clientId) ?? 0;
  }
}

export class FakePasswordHasher extends PasswordHasher {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }
  async verify(hash: string, plain: string) {
    return hash === `hashed:${plain}`;
  }
}

export class InMemoryServiceRepository extends ServiceRepository {
  readonly items = new Map<string, SalonService>();
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByIds(ids: readonly string[]) {
    return ids.map((id) => this.items.get(id)).filter((s): s is SalonService => !!s);
  }
  async list({ includeInactive }: { includeInactive: boolean }) {
    return [...this.items.values()].filter((s) => includeInactive || s.isActive);
  }
  async save(service: SalonService) {
    this.items.set(service.id, { ...service });
  }
}

export class InMemoryAssignmentRepository extends ProviderAssignmentRepository {
  readonly links: { providerId: string; serviceId: string }[] = [];
  async providerIdsOf(serviceId: string) {
    return this.links.filter((l) => l.serviceId === serviceId).map((l) => l.providerId);
  }
  async serviceIdsOf(providerId: string) {
    return this.links.filter((l) => l.providerId === providerId).map((l) => l.serviceId);
  }
  async providerIdsByService(serviceIds: readonly string[]) {
    return new Map(
      serviceIds.map((id) => [
        id,
        this.links.filter((l) => l.serviceId === id).map((l) => l.providerId),
      ]),
    );
  }
  async setProvidersOfService(serviceId: string, providerIds: readonly string[]) {
    this.links.splice(0, this.links.length, ...this.links.filter((l) => l.serviceId !== serviceId));
    providerIds.forEach((providerId) => this.links.push({ providerId, serviceId }));
  }
  async setServicesOfProvider(providerId: string, serviceIds: readonly string[]) {
    this.links.splice(
      0,
      this.links.length,
      ...this.links.filter((l) => l.providerId !== providerId),
    );
    serviceIds.forEach((serviceId) => this.links.push({ providerId, serviceId }));
  }
}

export class InMemoryProviderRepository extends ProviderRepository {
  readonly items = new Map<string, Provider>();
  lockCalls: string[][] = [];
  async findById(id: string) {
    return this.items.get(id) ?? null;
  }
  async findByUserId(userId: string) {
    return [...this.items.values()].find((p) => p.userId === userId) ?? null;
  }
  async findByIds(ids: readonly string[]) {
    return ids.map((id) => this.items.get(id)).filter((p): p is Provider => !!p);
  }
  async list({ includeInactive }: { includeInactive: boolean }) {
    return [...this.items.values()].filter((p) => includeInactive || p.isActive);
  }
  async save(provider: Provider) {
    this.items.set(provider.id, { ...provider });
  }
  async lockForBooking(ids: readonly string[]) {
    this.lockCalls.push([...ids]);
  }
}

export class InMemoryAvailabilityRepository extends AvailabilityRepository {
  readonly weekly = new Map<string, WeeklyAvailabilityRange[]>();
  readonly exceptions: AvailabilityException[] = [];
  async getWeekly(providerId: string) {
    return this.weekly.get(providerId) ?? [];
  }
  async replaceWeekly(providerId: string, ranges: readonly WeeklyAvailabilityRange[]) {
    this.weekly.set(providerId, [...ranges]);
  }
  async listExceptions(providerId: string) {
    return this.exceptions.filter((e) => e.providerId === providerId);
  }
  async findException(id: string) {
    return this.exceptions.find((e) => e.id === id) ?? null;
  }
  async addException(exception: AvailabilityException) {
    this.exceptions.push(exception);
  }
  async deleteException(id: string) {
    const i = this.exceptions.findIndex((e) => e.id === id);
    if (i >= 0) this.exceptions.splice(i, 1);
  }
  async getSchedules(
    providerIds: readonly string[],
    from: string,
    to: string,
  ): Promise<ProviderSchedule[]> {
    return providerIds.map((providerId) => ({
      providerId,
      weekly: this.weekly.get(providerId) ?? [],
      exceptions: this.exceptions.filter(
        (e) => e.providerId === providerId && e.date >= from && e.date <= to,
      ),
    }));
  }
}

export class InMemoryAppointmentRepository extends AppointmentRepository {
  readonly items = new Map<string, Appointment>();
  async findById(id: string) {
    const a = this.items.get(id);
    return a ? Appointment.restore(a.snapshot()) : null;
  }
  async findByGuestTokenHash(hash: string) {
    const a = [...this.items.values()].find((x) => x.guestTokenHash === hash);
    return a ? Appointment.restore(a.snapshot()) : null;
  }
  async save(appointment: Appointment) {
    this.items.set(appointment.id, Appointment.restore(appointment.snapshot()));
  }
  async findBlockedRanges(q: OccupancyQuery): Promise<BlockedRange[]> {
    return [...this.items.values()]
      .map((a) => a.snapshot())
      .filter(
        (a) =>
          q.providerIds.includes(a.providerId) &&
          a.id !== q.excludeAppointmentId &&
          a.blockedFrom < q.to &&
          a.blockedUntil > q.from &&
          Appointment.restore(a).isOccupying(q.now),
      )
      .map((a) => ({
        appointmentId: a.id,
        providerId: a.providerId,
        blockedFrom: a.blockedFrom,
        blockedUntil: a.blockedUntil,
      }));
  }
  async findWithElapsedHold(now: Date) {
    return [...this.items.values()]
      .filter((a) => a.isHoldExpired(now))
      .map((a) => Appointment.restore(a.snapshot()));
  }
  async findDueForReminder(from: Date, to: Date) {
    return [...this.items.values()]
      .filter((a) => {
        const s = a.snapshot();
        return (
          s.status === AppointmentStatus.DEPOSIT_PAID &&
          !s.reminderSentAt &&
          s.startAt >= from &&
          s.startAt < to
        );
      })
      .map((a) => Appointment.restore(a.snapshot()));
  }
  async codeExists(code: string) {
    return [...this.items.values()].some((a) => a.snapshot().code === code);
  }
}

export class InMemoryDepositRepository extends DepositRepository {
  readonly items = new Map<string, Deposit>();
  async findById(id: string) {
    const d = this.items.get(id);
    return d ? Deposit.restore(d.snapshot()) : null;
  }
  async findLatestByAppointment(appointmentId: string) {
    const d = [...this.items.values()].find((x) => x.appointmentId === appointmentId);
    return d ? Deposit.restore(d.snapshot()) : null;
  }
  async save(deposit: Deposit) {
    this.items.set(deposit.id, Deposit.restore(deposit.snapshot()));
  }
}

export class InMemoryReceiptStorage extends ReceiptStorage {
  readonly files = new Map<string, Buffer>();
  private counter = 0;
  async save(content: Buffer) {
    const key = `key-${++this.counter}.pdf`;
    this.files.set(key, content);
    return key;
  }
  async read(key: string) {
    return this.files.get(key) ?? Buffer.alloc(0);
  }
  async remove(key: string) {
    this.files.delete(key);
  }
}

/** Elige siempre el índice configurado (determinístico). */
export class FixedRandomPicker extends RandomPicker {
  constructor(public index = 0) {
    super();
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.min(this.index, items.length - 1)];
  }
}

export class FakeGuestTokenService extends GuestTokenService {
  private counter = 0;
  generate() {
    const token = `token-${++this.counter}`;
    return { token, hash: this.hash(token) };
  }
  hash(token: string) {
    return `hash(${token})`;
  }
}
