import { Appointment, NewAppointment } from './appointment';
import { AppointmentStatus, CancelledBy, DepositOutcome } from './appointment-status';
import {
  HoldExpiredError,
  InvalidStatusTransitionError,
  ReasonRequiredError,
} from './scheduling.errors';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

const create = (overrides: Partial<NewAppointment> = {}) =>
  Appointment.create({
    id: 'a1',
    code: 'TRN-TEST01',
    clientId: 'c1',
    providerId: 'p1',
    serviceId: 's1',
    startAt: new Date('2026-10-25T17:30:00.000Z'),
    durationMinutes: 90,
    prepMinutes: 10,
    cleanupMinutes: 5,
    price: 22000,
    depositAmount: 11000,
    guestTokenHash: null,
    createdByStaff: false,
    recommendationId: null,
    holdMinutes: 5,
    now: NOW,
    ...overrides,
  });

describe('Appointment (máquina de estados)', () => {
  it('nace CREATED con bloqueo de 5 minutos y rango bloqueado con prep/limpieza', () => {
    const a = create().snapshot();
    expect(a.status).toBe(AppointmentStatus.CREATED);
    expect(a.holdExpiresAt).toEqual(minutes(5));
    expect(a.endAt.toISOString()).toBe('2026-10-25T19:00:00.000Z');
    expect(a.blockedFrom.toISOString()).toBe('2026-10-25T17:20:00.000Z');
    expect(a.blockedUntil.toISOString()).toBe('2026-10-25T19:05:00.000Z');
  });

  it('CREATED → PAYMENT_INFORMED → DEPOSIT_PAID → FINISHED', () => {
    const a = create();
    a.informPayment(minutes(4));
    expect(a.status).toBe(AppointmentStatus.PAYMENT_INFORMED);
    expect(a.snapshot().holdExpiresAt).toBeNull();
    a.confirmDeposit();
    expect(a.status).toBe(AppointmentStatus.DEPOSIT_PAID);
    a.finish();
    expect(a.status).toBe(AppointmentStatus.FINISHED);
  });

  it('no acepta comprobante después de los 5 minutos', () => {
    expect(() => create().informPayment(minutes(5))).toThrow(HoldExpiredError);
  });

  it('expira sola si vence el bloqueo y deja de ocupar la agenda', () => {
    const a = create();
    expect(a.isOccupying(minutes(1))).toBe(true);
    expect(a.isOccupying(minutes(6))).toBe(false);
    expect(a.expireIfHoldElapsed(minutes(2))).toBe(false);
    expect(a.expireIfHoldElapsed(minutes(6))).toBe(true);
    expect(a.status).toBe(AppointmentStatus.EXPIRED);
  });

  it('con comprobante adjunto ya no vence automáticamente', () => {
    const a = create();
    a.informPayment(minutes(1));
    expect(a.expireIfHoldElapsed(minutes(600))).toBe(false);
    expect(a.isOccupying(minutes(600))).toBe(true);
  });

  it('rechazo de seña → EXPIRED (no reutilizable)', () => {
    const a = create();
    a.informPayment(minutes(1));
    a.rejectDeposit();
    expect(a.status).toBe(AppointmentStatus.EXPIRED);
    expect(() => a.informPayment(minutes(2))).toThrow(InvalidStatusTransitionError);
  });

  it('cancelación del cliente aplica la política de 24 h', () => {
    const early = create();
    early.informPayment(minutes(1));
    expect(
      early.cancel({ by: CancelledBy.CLIENT, reason: null, now: NOW, refundWindowHours: 24 }),
    ).toBe(DepositOutcome.REFUND);
    expect(early.status).toBe(AppointmentStatus.CANCELLED);
  });

  it('el personal debe indicar motivo para cancelar o reprogramar', () => {
    const a = create();
    a.informPayment(minutes(1));
    expect(() =>
      a.cancel({ by: CancelledBy.PROVIDER, reason: ' ', now: NOW, refundWindowHours: 24 }),
    ).toThrow(ReasonRequiredError);
    expect(() =>
      a.reschedule(
        {
          providerId: 'p1',
          startAt: minutes(60),
          durationMinutes: 90,
          prepMinutes: 0,
          cleanupMinutes: 0,
        },
        '',
      ),
    ).toThrow(ReasonRequiredError);
  });

  it('reprogramar conserva el estado y registra el motivo', () => {
    const a = create();
    a.informPayment(minutes(1));
    a.confirmDeposit();
    a.reschedule(
      {
        providerId: 'p2',
        startAt: new Date('2026-10-26T13:00:00.000Z'),
        durationMinutes: 90,
        prepMinutes: 10,
        cleanupMinutes: 5,
      },
      'Pedido de la clienta',
    );
    const s = a.snapshot();
    expect(s.status).toBe(AppointmentStatus.DEPOSIT_PAID);
    expect(s.rescheduled).toBe(true);
    expect(s.providerId).toBe('p2');
    expect(s.endAt.toISOString()).toBe('2026-10-26T14:30:00.000Z');
  });

  it('no se puede reprogramar una reserva sin comprobante ni finalizar sin seña', () => {
    const a = create();
    expect(() => a.finish()).toThrow(InvalidStatusTransitionError);
    expect(() =>
      a.reschedule(
        {
          providerId: 'p1',
          startAt: minutes(60),
          durationMinutes: 90,
          prepMinutes: 0,
          cleanupMinutes: 0,
        },
        'x',
      ),
    ).toThrow(InvalidStatusTransitionError);
  });
});
