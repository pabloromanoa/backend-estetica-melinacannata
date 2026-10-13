import { AppointmentStatus, DepositOutcome } from '../../scheduling/domain/appointment-status';
import {
  agendaEfficiencyReport,
  appointmentsReport,
  cancellationsReport,
  recommendationsReport,
  servicesReport,
} from './report-builders';
import { isPerformed, ReportAppointment } from './reporting.model';

const NOW = new Date('2026-10-20T23:00:00.000Z');
const appt = (overrides: Partial<ReportAppointment>): ReportAppointment => ({
  id: Math.random().toString(),
  status: AppointmentStatus.FINISHED,
  startAt: new Date('2026-10-20T13:00:00.000Z'),
  endAt: new Date('2026-10-20T14:00:00.000Z'),
  providerId: 'ana',
  providerName: 'Ana',
  serviceId: 'masaje',
  serviceName: 'Masaje',
  clientId: 'c1',
  clientName: 'Flor B',
  price: 20000,
  depositOutcome: null,
  cancellationReason: null,
  cancelledBy: null,
  cancelledAt: null,
  ...overrides,
});
const localDate = (d: Date) => d.toISOString().slice(0, 10);

describe('Informes', () => {
  it('un turno señado cuyo horario ya pasó cuenta como prestado', () => {
    expect(isPerformed(appt({ status: AppointmentStatus.DEPOSIT_PAID }), NOW)).toBe(true);
    expect(
      isPerformed(
        appt({ status: AppointmentStatus.DEPOSIT_PAID, endAt: new Date('2026-10-21T00:00:00Z') }),
        NOW,
      ),
    ).toBe(false);
    expect(isPerformed(appt({ status: AppointmentStatus.CANCELLED }), NOW)).toBe(false);
  });

  it('turnos por período por estado', () => {
    const report = appointmentsReport(
      [
        appt({}),
        appt({ status: AppointmentStatus.CANCELLED }),
        appt({ status: AppointmentStatus.EXPIRED }),
      ],
      localDate,
    );
    expect(report.summary.find((s) => s.label === 'Cantidad total')?.value).toBe(3);
    expect(report.tables[0].rows).toEqual([['2026-10-20', 3, 1, 0, 1, 1]]);
  });

  it('servicios: ranking y valor económico de lo prestado', () => {
    const report = servicesReport(
      [appt({}), appt({}), appt({ serviceId: 'limpieza', serviceName: 'Limpieza', price: 10000 })],
      NOW,
    );
    expect(report.tables[0].rows[0]).toEqual(['Masaje', 2, 2, 40000]);
    expect(report.summary[1].value).toBe('Masaje');
  });

  it('cancelaciones con devolución y con pérdida de seña', () => {
    const cancelled = [
      appt({
        status: AppointmentStatus.CANCELLED,
        depositOutcome: DepositOutcome.REFUND,
        cancelledAt: NOW,
      }),
      appt({
        status: AppointmentStatus.CANCELLED,
        depositOutcome: DepositOutcome.FORFEIT,
        cancelledAt: NOW,
      }),
    ];
    const report = cancellationsReport(cancelled, 10, localDate);
    expect(report.summary.map((s) => s.value)).toEqual([2, '20 %', 1, 1, 0]);
  });

  it('eficiencia de agenda: huecos y ocupación', () => {
    const report = agendaEfficiencyReport([
      {
        providerId: 'ana',
        providerName: 'Ana',
        capacityMinutes: 480,
        bookedMinutes: 360,
        freeMinutes: 120,
        gapCount: 2,
        gapMinutes: 120,
      },
    ]);
    expect(report.summary.map((s) => s.value)).toEqual([360, 120, 2, 60, '75 %']);
  });

  it('recomendaciones: aceptadas, descartadas y conversión a reserva', () => {
    const report = recommendationsReport([
      {
        optionName: 'Masaje',
        type: 'SERVICE',
        confidence: 0.8,
        outcome: 'ACCEPTED',
        ledToBooking: true,
      },
      {
        optionName: 'Masaje',
        type: 'SERVICE',
        confidence: 0.6,
        outcome: 'DISCARDED',
        ledToBooking: false,
      },
    ]);
    expect(report.summary.map((s) => s.value)).toEqual([2, '70 %', 1, 1, '50 %']);
    expect(report.tables[0].rows).toEqual([['Masaje', 'Servicio', 2]]);
  });
});
