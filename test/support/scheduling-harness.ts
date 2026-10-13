import { NoopUnitOfWork } from '../../src/shared/application/unit-of-work';
import { BookingPolicy } from '../../src/shared/domain/booking-policy';
import { BusinessTime } from '../../src/shared/domain/business-time';
import { FixedClock } from '../../src/shared/domain/clock';
import { SequentialIdGenerator } from '../../src/shared/domain/id-generator';
import { ClientRegistry } from '../../src/modules/identity/application/client-registry.service';
import { RecommendationUseCases } from '../../src/modules/recommendations/application/recommendation.use-cases';
import { AppointmentLocator } from '../../src/modules/scheduling/application/appointment-locator.service';
import { AppointmentNotices } from '../../src/modules/scheduling/application/appointment-notices';
import { AppointmentViews } from '../../src/modules/scheduling/application/appointment-views.service';
import { AppointmentView } from '../../src/modules/scheduling/application/appointment.views';
import { AvailabilityService } from '../../src/modules/scheduling/application/availability.service';
import { BookAppointmentUseCase } from '../../src/modules/scheduling/application/book-appointment.use-case';
import { CancelAppointmentUseCase } from '../../src/modules/scheduling/application/cancel-appointment.use-case';
import { ReviewDepositUseCase } from '../../src/modules/scheduling/application/review-deposit.use-case';
import { UploadReceiptUseCase } from '../../src/modules/scheduling/application/upload-receipt.use-case';
import { ReceiptPolicy } from '../../src/modules/scheduling/domain/receipt-file';
import { aProvider, aService, everyDay } from './builders';
import {
  FakeGuestTokenService,
  FixedRandomPicker,
  InMemoryAppointmentRepository,
  InMemoryAssignmentRepository,
  InMemoryAvailabilityRepository,
  InMemoryClientRepository,
  InMemoryDepositRepository,
  InMemoryProviderRepository,
  InMemoryReceiptStorage,
  InMemoryServiceRepository,
} from './in-memory-repositories';

/** Ensambla los casos de uso de turnos con dobles en memoria (sin Nest ni base de datos). */
export function schedulingHarness(now = new Date('2026-10-20T12:00:00.000Z')) {
  const clock = new FixedClock(now);
  const time = new BusinessTime('America/Argentina/Buenos_Aires');
  const ids = new SequentialIdGenerator('id');
  const policy = new BookingPolicy(50, 5, 30, 24, 24);
  const uow = new NoopUnitOfWork();

  const services = new InMemoryServiceRepository();
  const assignments = new InMemoryAssignmentRepository();
  const providers = new InMemoryProviderRepository();
  const availabilityRepo = new InMemoryAvailabilityRepository();
  const appointments = new InMemoryAppointmentRepository();
  const deposits = new InMemoryDepositRepository();
  const clients = new InMemoryClientRepository();
  const storage = new InMemoryReceiptStorage();
  const tokens = new FakeGuestTokenService();
  const random = new FixedRandomPicker(0);

  const views = {
    get: jest.fn(async (id: string) => {
      const a = (await appointments.findById(id))!.snapshot();
      return { ...a, id } as unknown as AppointmentView;
    }),
  } as unknown as AppointmentViews;
  const notices = {
    bookingCreated: jest.fn(),
    depositConfirmed: jest.fn(),
    depositRejected: jest.fn(),
    cancelled: jest.fn(),
    rescheduled: jest.fn(),
    reminder: jest.fn(),
  } as unknown as jest.Mocked<AppointmentNotices>;
  const recommendations = {
    markBooked: jest.fn(async () => undefined),
  } as unknown as RecommendationUseCases;

  const availability = new AvailabilityService(
    services,
    assignments,
    providers,
    availabilityRepo,
    appointments,
    time,
    clock,
  );
  const clientRegistry = new ClientRegistry(clients, ids);
  const locator = new AppointmentLocator(appointments, tokens);

  const book = new BookAppointmentUseCase(
    availability,
    appointments,
    providers,
    clientRegistry,
    recommendations,
    views,
    notices,
    tokens,
    random,
    { next: () => `TRN-${ids.next()}` },
    policy,
    ids,
    clock,
    uow,
  );
  const upload = new UploadReceiptUseCase(
    locator,
    appointments,
    deposits,
    storage,
    views,
    ids,
    clock,
    uow,
    new ReceiptPolicy(5 * 1024 * 1024),
  );
  const review = new ReviewDepositUseCase(
    deposits,
    appointments,
    locator,
    storage,
    views,
    notices,
    clock,
    uow,
  );
  const cancel = new CancelAppointmentUseCase(locator, appointments, views, notices, policy, clock);

  /** Datos base: servicio de 60 min (seña 50 %) y dos prestadoras de 09 a 18 todos los días. */
  function seed() {
    const service = aService({ id: 'svc', price: 20000 });
    services.items.set(service.id, service);
    for (const p of [
      aProvider({ id: 'ana', userId: 'u-ana' }),
      aProvider({ id: 'sofi', userId: 'u-sofi', displayName: 'Sofi' }),
    ]) {
      providers.items.set(p.id, p);
      assignments.links.push({ providerId: p.id, serviceId: service.id });
      availabilityRepo.weekly.set(p.id, everyDay('09:00', '18:00'));
    }
    return service;
  }

  return {
    clock,
    time,
    policy,
    services,
    assignments,
    providers,
    availabilityRepo,
    appointments,
    deposits,
    clients,
    storage,
    tokens,
    random,
    notices,
    recommendations,
    availability,
    book,
    upload,
    review,
    cancel,
    seed,
  };
}

export const GUEST = {
  firstName: 'Florencia',
  lastName: 'Benítez',
  dni: '38491024',
  phone: '1148291102',
};
export const PDF = {
  originalName: 'comprobante.pdf',
  declaredMimeType: 'application/pdf',
  sizeBytes: 12,
  content: Buffer.from('%PDF-1.7 ok!'),
};
