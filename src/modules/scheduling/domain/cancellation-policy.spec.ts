import { AppointmentStatus, CancelledBy, DepositOutcome } from './appointment-status';
import { resolveDepositOutcome } from './cancellation-policy';

const startAt = new Date('2026-10-25T17:00:00.000Z');
const hoursBefore = (h: number) => new Date(startAt.getTime() - h * 3_600_000);
const outcome = (status: AppointmentStatus, by: CancelledBy, hours: number) =>
  resolveDepositOutcome({
    status,
    startAt,
    now: hoursBefore(hours),
    cancelledBy: by,
    refundWindowHours: 24,
  });

describe('Política de cancelación (24 h)', () => {
  it.each([
    [24, DepositOutcome.REFUND],
    [30, DepositOutcome.REFUND],
    [23.99, DepositOutcome.FORFEIT],
    [1, DepositOutcome.FORFEIT],
  ])('cliente cancela %s h antes → %s', (hours, expected) => {
    expect(outcome(AppointmentStatus.DEPOSIT_PAID, CancelledBy.CLIENT, hours)).toBe(expected);
  });

  it('si el establecimiento cancela, siempre corresponde devolución', () => {
    expect(outcome(AppointmentStatus.DEPOSIT_PAID, CancelledBy.PROVIDER, 1)).toBe(
      DepositOutcome.REFUND,
    );
    expect(outcome(AppointmentStatus.PAYMENT_INFORMED, CancelledBy.ADMIN, 1)).toBe(
      DepositOutcome.REFUND,
    );
  });

  it('sin seña transferida no aplica', () => {
    expect(outcome(AppointmentStatus.CREATED, CancelledBy.CLIENT, 1)).toBe(
      DepositOutcome.NOT_APPLICABLE,
    );
  });
});
