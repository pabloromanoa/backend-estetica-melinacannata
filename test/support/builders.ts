import { SalonService } from '../../src/modules/catalog/domain/catalog';
import { EMPTY_BANK_DETAILS, Provider } from '../../src/modules/staff/domain/provider';
import { WeeklyAvailabilityRange } from '../../src/modules/staff/domain/availability';

export const aService = (overrides: Partial<SalonService> = {}): SalonService => ({
  id: 'svc-1',
  name: 'Masaje descontracturante',
  description: null,
  imageUrl: null,
  durationMinutes: 60,
  price: 20000,
  prepMinutes: 0,
  cleanupMinutes: 0,
  isActive: true,
  recommendationTags: ['relajacion'],
  specificDates: [],
  categoryIds: [],
  ...overrides,
});

export const aProvider = (overrides: Partial<Provider> = {}): Provider => ({
  id: 'prov-1',
  userId: 'user-prov-1',
  displayName: 'Ana',
  specialty: null,
  bio: null,
  avatarUrl: null,
  isActive: true,
  bankDetails: { ...EMPTY_BANK_DETAILS, alias: 'ANA.ALIAS' },
  ...overrides,
});

/** Lunes a sábado en el horario indicado. */
export const everyDay = (startTime: string, endTime: string): WeeklyAvailabilityRange[] =>
  ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => ({ dayOfWeek, startTime, endTime }));
