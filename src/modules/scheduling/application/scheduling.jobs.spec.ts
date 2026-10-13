import { GUEST, PDF, schedulingHarness } from '../../../../test/support/scheduling-harness';
import { AppointmentStatus } from '../domain/appointment-status';
import { AppointmentViews } from './appointment-views.service';
import { SchedulingJobs } from './scheduling.jobs';

describe('SchedulingJobs', () => {
  const jobsFor = (h: ReturnType<typeof schedulingHarness>) =>
    new SchedulingJobs(
      h.appointments,
      { get: async (id: string) => ({ id }) } as unknown as AppointmentViews,
      h.notices,
      h.policy,
      h.clock,
    );

  it('expira reservas temporales vencidas', async () => {
    const h = schedulingHarness();
    h.seed();
    const { appointment } = await h.book.execute(
      { serviceId: 'svc', startAt: new Date('2026-10-21T13:00:00.000Z'), guest: GUEST },
      null,
    );
    const jobs = jobsFor(h);
    expect(await jobs.expireHolds()).toBe(0);
    h.clock.advanceMinutes(5);
    expect(await jobs.expireHolds()).toBe(1);
    expect(h.appointments.items.get(appointment.id)!.status).toBe(AppointmentStatus.EXPIRED);
  });

  it('envía el recordatorio 24 h antes de un turno señado, una sola vez', async () => {
    const h = schedulingHarness(new Date('2026-10-19T13:00:00.000Z'));
    h.seed();
    const { appointment, guestAccessToken } = await h.book.execute(
      { serviceId: 'svc', startAt: new Date('2026-10-21T13:00:00.000Z'), guest: GUEST },
      null,
    );
    await h.upload.execute({ kind: 'guest', token: guestAccessToken! }, PDF);
    const deposit = [...h.deposits.items.values()][0];
    const providerId = h.appointments.items.get(appointment.id)!.providerId;
    await h.review.verify(deposit.id, { userId: 'staff', roles: [], providerId, clientId: null });

    const jobs = jobsFor(h);
    h.clock.set(new Date('2026-10-20T12:55:00.000Z')); // 24h05m antes
    expect(await jobs.sendReminders()).toBe(1);
    expect(await jobs.sendReminders()).toBe(0);
    expect(h.notices.reminder).toHaveBeenCalledTimes(1);
  });
});
