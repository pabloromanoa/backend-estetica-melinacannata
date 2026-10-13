import { schedulingHarness } from '../../../../test/support/scheduling-harness';
import { ExceptionType } from '../../staff/domain/availability';

const localTimes = (h: ReturnType<typeof schedulingHarness>, slots: { startAt: Date }[]) =>
  slots.map((s) => {
    const minutes = h.time.minutesFromStartOf(h.time.localDate(s.startAt), s.startAt);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  });

describe('AvailabilityService', () => {
  it('ofrece horarios de todas las prestadoras habilitadas indicando quién atiende', async () => {
    const h = schedulingHarness();
    h.seed();
    const slots = await h.availability.slots({ serviceId: 'svc', date: '2026-10-21' });
    expect(localTimes(h, slots).slice(0, 3)).toEqual(['09:00', '10:00', '11:00']);
    expect(slots[0].providers.map((p) => p.id)).toEqual(['ana', 'sofi']);
  });

  it('filtra por prestador elegido y aplica excepciones', async () => {
    const h = schedulingHarness();
    h.seed();
    h.availabilityRepo.exceptions.push({
      id: 'x',
      providerId: 'ana',
      date: '2026-10-21',
      type: ExceptionType.UNAVAILABLE,
      startTime: null,
      endTime: null,
      reason: 'Licencia',
    });
    expect(
      await h.availability.slots({ serviceId: 'svc', date: '2026-10-21', providerId: 'ana' }),
    ).toEqual([]);
    expect(
      await h.availability.slots({ serviceId: 'svc', date: '2026-10-21', providerId: 'sofi' }),
    ).not.toEqual([]);
  });

  it('no ofrece horarios pasados y redondea "ahora" a 15 minutos', async () => {
    const h = schedulingHarness(new Date('2026-10-20T14:07:00.000Z')); // 11:07 local
    h.seed();
    expect(await h.availability.slots({ serviceId: 'svc', date: '2026-10-19' })).toEqual([]);
    const today = await h.availability.slots({ serviceId: 'svc', date: '2026-10-20' });
    expect(localTimes(h, today)[0]).toBe('11:15');
  });

  it('servicios con fechas específicas sólo se ofrecen esos días', async () => {
    const h = schedulingHarness();
    const service = h.seed();
    h.services.items.set(service.id, { ...service, specificDates: ['2026-10-22'] });
    expect(await h.availability.slots({ serviceId: 'svc', date: '2026-10-21' })).toEqual([]);
    expect(await h.availability.slots({ serviceId: 'svc', date: '2026-10-22' })).not.toEqual([]);
  });

  it('próximos horarios: busca en los días siguientes hasta el límite', async () => {
    const h = schedulingHarness();
    h.seed();
    const next = await h.availability.nextSlots({ serviceId: 'svc', days: 3, limit: 12 });
    expect(next).toHaveLength(12);
    await expect(
      h.availability.nextSlots({ serviceId: 'svc', days: 40, limit: 1 }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('servicio inactivo o inexistente → NOT_FOUND', async () => {
    const h = schedulingHarness();
    const service = h.seed();
    h.services.items.set(service.id, { ...service, isActive: false });
    await expect(
      h.availability.slots({ serviceId: 'svc', date: '2026-10-21' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
