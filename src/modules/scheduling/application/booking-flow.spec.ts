import { Role } from '../../../shared/domain/role';
import { GUEST, PDF, schedulingHarness } from '../../../../test/support/scheduling-harness';
import { AppointmentStatus, DepositOutcome } from '../domain/appointment-status';
import { DepositStatus } from '../domain/deposit';

// 2026-10-21 10:00 hora local = 13:00Z
const AT_10 = new Date('2026-10-21T13:00:00.000Z');
const staff = (providerId: string, admin = false) => ({
  userId: `u-${providerId}`,
  roles: admin ? [Role.ADMIN, Role.PROVIDER] : [Role.PROVIDER],
  providerId,
  clientId: null,
});

describe('Flujo de reserva (casos de uso)', () => {
  it('invitado reserva: CREATED, seña 50 %, token de enlace privado y notificación', async () => {
    const h = schedulingHarness();
    h.seed();
    const result = await h.book.execute({ serviceId: 'svc', startAt: AT_10, guest: GUEST }, null);

    const saved = (await h.appointments.findById(result.appointment.id))!.snapshot();
    expect(saved.status).toBe(AppointmentStatus.CREATED);
    expect(saved.depositAmount).toBe(10000);
    expect(saved.holdExpiresAt).toEqual(new Date('2026-10-20T12:05:00.000Z'));
    expect(result.guestAccessToken).toBe('token-1');
    expect(h.notices.bookingCreated).toHaveBeenCalledTimes(1);
  });

  it('bloquea a los prestadores candidatos antes de revalidar (anti doble reserva)', async () => {
    const h = schedulingHarness();
    h.seed();
    await h.book.execute({ serviceId: 'svc', startAt: AT_10, guest: GUEST }, null);
    expect(h.providers.lockCalls).toEqual([['ana', 'sofi']]);
  });

  it('sin preferencia asigna entre los libres; cuando se ocupan todos, el horario deja de estar disponible', async () => {
    const h = schedulingHarness();
    h.seed();
    const first = await h.book.execute({ serviceId: 'svc', startAt: AT_10, guest: GUEST }, null);
    const second = await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, guest: { ...GUEST, dni: '30111222' } },
      null,
    );
    expect(first.appointment).toBeDefined();
    const assigned = [first, second].map(
      (r) => h.appointments.items.get(r.appointment.id)!.providerId,
    );
    expect(new Set(assigned)).toEqual(new Set(['ana', 'sofi']));

    await expect(
      h.book.execute(
        { serviceId: 'svc', startAt: AT_10, guest: { ...GUEST, dni: '30111333' } },
        null,
      ),
    ).rejects.toMatchObject({ code: 'SLOT_NOT_AVAILABLE' });
  });

  it('una reserva temporal vencida libera el horario', async () => {
    const h = schedulingHarness();
    h.seed();
    await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, providerId: 'ana', guest: GUEST },
      null,
    );
    await expect(
      h.book.execute(
        {
          serviceId: 'svc',
          startAt: AT_10,
          providerId: 'ana',
          guest: { ...GUEST, dni: '1234567' },
        },
        null,
      ),
    ).rejects.toMatchObject({ code: 'SLOT_NOT_AVAILABLE' });

    h.clock.advanceMinutes(6);
    await expect(
      h.book.execute(
        {
          serviceId: 'svc',
          startAt: AT_10,
          providerId: 'ana',
          guest: { ...GUEST, dni: '1234567' },
        },
        null,
      ),
    ).resolves.toBeDefined();
  });

  it('valida prestador habilitado y datos obligatorios del invitado', async () => {
    const h = schedulingHarness();
    h.seed();
    h.assignments.links.splice(1, 1); // sofi ya no realiza el servicio
    await expect(
      h.book.execute({ serviceId: 'svc', startAt: AT_10, providerId: 'sofi', guest: GUEST }, null),
    ).rejects.toMatchObject({ code: 'PROVIDER_NOT_QUALIFIED' });
    await expect(h.book.execute({ serviceId: 'svc', startAt: AT_10 }, null)).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('un invitado no puede reservar con el DNI de una cuenta registrada', async () => {
    const h = schedulingHarness();
    h.seed();
    h.clients.items.set('c1', {
      id: 'c1',
      userId: 'u1',
      firstName: 'F',
      lastName: 'B',
      dni: GUEST.dni,
      phone: '1',
      email: 'f@x.com',
    });
    await expect(
      h.book.execute({ serviceId: 'svc', startAt: AT_10, guest: GUEST }, null),
    ).rejects.toMatchObject({
      code: 'LOGIN_REQUIRED',
    });
  });

  it('un prestador sólo carga turnos en su propia agenda (con bloqueo extendido de staff)', async () => {
    const h = schedulingHarness();
    h.seed();
    await expect(
      h.book.execute(
        { serviceId: 'svc', startAt: AT_10, providerId: 'sofi', guest: GUEST },
        staff('ana'),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const ok = await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, guest: GUEST },
      staff('ana'),
    );
    const saved = h.appointments.items.get(ok.appointment.id)!.snapshot();
    expect(saved.providerId).toBe('ana');
    expect(saved.createdByStaff).toBe(true);
    expect(saved.holdExpiresAt).toEqual(new Date('2026-10-20T12:30:00.000Z'));
  });

  it('comprobante → PAYMENT_INFORMED; verificación → DEPOSIT_PAID', async () => {
    const h = schedulingHarness();
    h.seed();
    const { appointment, guestAccessToken } = await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, providerId: 'ana', guest: GUEST },
      null,
    );
    await h.upload.execute({ kind: 'guest', token: guestAccessToken! }, PDF);
    expect(h.appointments.items.get(appointment.id)!.status).toBe(
      AppointmentStatus.PAYMENT_INFORMED,
    );
    const [deposit] = [...h.deposits.items.values()];
    expect(deposit.status).toBe(DepositStatus.PENDING);
    expect(h.storage.files.size).toBe(1);

    await expect(h.review.verify(deposit.id, staff('sofi'))).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await h.review.verify(deposit.id, staff('ana'));
    expect(h.appointments.items.get(appointment.id)!.status).toBe(AppointmentStatus.DEPOSIT_PAID);
    expect(h.notices.depositConfirmed).toHaveBeenCalled();
  });

  it('comprobante fuera de término y rechazo de seña', async () => {
    const h = schedulingHarness();
    h.seed();
    const late = await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, providerId: 'ana', guest: GUEST },
      null,
    );
    h.clock.advanceMinutes(5);
    await expect(
      h.upload.execute({ kind: 'guest', token: late.guestAccessToken! }, PDF),
    ).rejects.toMatchObject({
      code: 'HOLD_EXPIRED',
    });

    const other = await h.book.execute(
      {
        serviceId: 'svc',
        startAt: AT_10,
        providerId: 'sofi',
        guest: { ...GUEST, dni: '30111222' },
      },
      null,
    );
    await h.upload.execute({ kind: 'guest', token: other.guestAccessToken! }, PDF);
    const deposit = [...h.deposits.items.values()][0];
    await h.review.reject(deposit.id, 'No es un comprobante', staff('admin', true));
    expect(h.appointments.items.get(other.appointment.id)!.status).toBe(AppointmentStatus.EXPIRED);
    expect(h.deposits.items.get(deposit.id)!.status).toBe(DepositStatus.REJECTED);
  });

  it('cancelación del invitado por enlace privado aplica la política de 24 h', async () => {
    const h = schedulingHarness();
    h.seed();
    const { guestAccessToken } = await h.book.execute(
      { serviceId: 'svc', startAt: AT_10, providerId: 'ana', guest: GUEST },
      null,
    );
    await h.upload.execute({ kind: 'guest', token: guestAccessToken! }, PDF);
    h.clock.set(new Date('2026-10-21T00:00:00.000Z')); // faltan 13 h
    const view = await h.cancel.execute({ kind: 'guest', token: guestAccessToken! }, null);
    expect(view.depositOutcome).toBe(DepositOutcome.FORFEIT);
    await expect(h.cancel.execute({ kind: 'guest', token: 'otro' }, null)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
