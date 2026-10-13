import { AppointmentStatus, DepositOutcome } from '../../scheduling/domain/appointment-status';
import { percentage } from '../../scheduling/domain/occupancy';
import {
  isPerformed,
  ReportAppointment,
  ReportRecommendation,
  ReportResult,
  sum,
} from './reporting.model';

/**
 * Constructores de informes: funciones puras que transforman datos crudos en `ReportResult`.
 * Toda la lógica de negocio de los informes vive acá (testeable sin base de datos).
 */
type Body = Pick<ReportResult, 'summary' | 'tables'>;

const countBy = <T>(items: T[], key: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) map.set(key(item), [...(map.get(key(item)) ?? []), item]);
  return map;
};

export function appointmentsReport(
  appointments: ReportAppointment[],
  localDate: (d: Date) => string,
): Body {
  const by = (s: AppointmentStatus) => appointments.filter((a) => a.status === s).length;
  const perDay = [...countBy(appointments, (a) => localDate(a.startAt)).entries()].sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return {
    summary: [
      { label: 'Cantidad total', value: appointments.length },
      { label: 'Finalizados', value: by(AppointmentStatus.FINISHED) },
      { label: 'Señados', value: by(AppointmentStatus.DEPOSIT_PAID) },
      { label: 'Pago informado (por validar)', value: by(AppointmentStatus.PAYMENT_INFORMED) },
      { label: 'Cancelados', value: by(AppointmentStatus.CANCELLED) },
      { label: 'Expirados', value: by(AppointmentStatus.EXPIRED) },
    ],
    tables: [
      {
        title: 'Turnos por día',
        columns: ['Fecha', 'Total', 'Finalizados', 'Señados', 'Cancelados', 'Expirados'],
        rows: perDay.map(([day, list]) => [
          day,
          list.length,
          list.filter((a) => a.status === AppointmentStatus.FINISHED).length,
          list.filter((a) => a.status === AppointmentStatus.DEPOSIT_PAID).length,
          list.filter((a) => a.status === AppointmentStatus.CANCELLED).length,
          list.filter((a) => a.status === AppointmentStatus.EXPIRED).length,
        ]),
      },
    ],
  };
}

export function servicesReport(appointments: ReportAppointment[], now: Date): Body {
  const booked = appointments.filter((a) => a.status !== AppointmentStatus.EXPIRED);
  const rows = [...countBy(booked, (a) => a.serviceId).values()]
    .map((list) => {
      const performed = list.filter((a) => isPerformed(a, now));
      return {
        name: list[0].serviceName,
        reservations: list.length,
        performed: performed.length,
        value: sum(performed.map((a) => a.price)),
      };
    })
    .sort((a, b) => b.reservations - a.reservations);
  return {
    summary: [
      { label: 'Servicios distintos reservados', value: rows.length },
      { label: 'Servicio más demandado', value: rows[0]?.name ?? '—' },
      { label: 'Valor económico asociado', value: sum(rows.map((r) => r.value)) },
    ],
    tables: [
      {
        title: 'Reservas por servicio',
        columns: ['Servicio', 'Reservas', 'Prestados', 'Valor asociado ($)'],
        rows: rows.map((r) => [r.name, r.reservations, r.performed, r.value]),
      },
    ],
  };
}

export interface ProviderOccupancy {
  providerId: string;
  providerName: string;
  capacityMinutes: number;
  bookedMinutes: number;
  freeMinutes: number;
  gapCount: number;
  gapMinutes: number;
}

export function providersReport(
  appointments: ReportAppointment[],
  occupancy: ProviderOccupancy[],
  now: Date,
): Body {
  const rows = occupancy.map((o) => {
    const own = appointments.filter(
      (a) =>
        a.providerId === o.providerId &&
        a.status !== AppointmentStatus.EXPIRED &&
        a.status !== AppointmentStatus.CANCELLED,
    );
    return [
      o.providerName,
      own.length,
      Math.round((o.bookedMinutes / 60) * 10) / 10,
      percentage(o.bookedMinutes, o.capacityMinutes),
      sum(own.filter((a) => isPerformed(a, now)).map((a) => a.price)),
    ];
  });
  return {
    summary: [{ label: 'Prestadores', value: occupancy.length }],
    tables: [
      {
        title: 'Actividad por prestador',
        columns: ['Prestador', 'Turnos', 'Horas ocupadas', '% Ocupación', 'Valor asociado ($)'],
        rows,
      },
    ],
  };
}

export function cancellationsReport(
  cancelled: ReportAppointment[],
  totalInPeriod: number,
  localDate: (d: Date) => string,
): Body {
  const by = (o: DepositOutcome) => cancelled.filter((a) => a.depositOutcome === o).length;
  return {
    summary: [
      { label: 'Cancelaciones', value: cancelled.length },
      {
        label: '% sobre turnos del período',
        value: `${percentage(cancelled.length, totalInPeriod)} %`,
      },
      { label: 'Con devolución de seña', value: by(DepositOutcome.REFUND) },
      { label: 'Con pérdida de seña', value: by(DepositOutcome.FORFEIT) },
      { label: 'Sin seña transferida', value: by(DepositOutcome.NOT_APPLICABLE) },
    ],
    tables: [
      {
        title: 'Detalle de cancelaciones',
        columns: ['Fecha cancelación', 'Turno', 'Cliente', 'Servicio', 'Canceló', 'Seña', 'Motivo'],
        rows: cancelled.map((a) => [
          a.cancelledAt ? localDate(a.cancelledAt) : '',
          localDate(a.startAt),
          a.clientName,
          a.serviceName,
          a.cancelledBy ?? '',
          a.depositOutcome ?? '',
          a.cancellationReason ?? '',
        ]),
      },
    ],
  };
}

export function agendaEfficiencyReport(occupancy: ProviderOccupancy[]): Body {
  const booked = sum(occupancy.map((o) => o.bookedMinutes));
  const free = sum(occupancy.map((o) => o.freeMinutes));
  const gaps = sum(occupancy.map((o) => o.gapCount));
  const gapMinutes = sum(occupancy.map((o) => o.gapMinutes));
  return {
    summary: [
      { label: 'Minutos ocupados', value: booked },
      { label: 'Minutos libres', value: free },
      { label: 'Cantidad de huecos', value: gaps },
      {
        label: 'Duración promedio de huecos (min)',
        value: gaps ? Math.round(gapMinutes / gaps) : 0,
      },
      { label: '% de ocupación', value: `${percentage(booked, booked + free)} %` },
    ],
    tables: [
      {
        title: 'Eficiencia por prestador',
        columns: [
          'Prestador',
          'Min. ocupados',
          'Min. libres',
          'Huecos',
          'Prom. hueco (min)',
          '% Ocupación',
        ],
        rows: occupancy.map((o) => [
          o.providerName,
          o.bookedMinutes,
          o.freeMinutes,
          o.gapCount,
          o.gapCount ? Math.round(o.gapMinutes / o.gapCount) : 0,
          percentage(o.bookedMinutes, o.capacityMinutes),
        ]),
      },
    ],
  };
}

export function recommendationsReport(list: ReportRecommendation[]): Body {
  const ranking = [...countBy(list, (r) => `${r.type}:${r.optionName}`).values()]
    .map((items) => ({ name: items[0].optionName, type: items[0].type, count: items.length }))
    .sort((a, b) => b.count - a.count);
  const avg = list.length ? sum(list.map((r) => r.confidence)) / list.length : 0;
  return {
    summary: [
      { label: 'Recomendaciones realizadas', value: list.length },
      { label: 'Confianza promedio', value: `${Math.round(avg * 1000) / 10} %` },
      { label: 'Aceptadas', value: list.filter((r) => r.outcome === 'ACCEPTED').length },
      { label: 'Descartadas', value: list.filter((r) => r.outcome === 'DISCARDED').length },
      {
        label: 'Derivaron en reserva',
        value: `${percentage(list.filter((r) => r.ledToBooking).length, list.length)} %`,
      },
    ],
    tables: [
      {
        title: 'Más recomendados',
        columns: ['Servicio / Tratamiento', 'Tipo', 'Veces'],
        rows: ranking.map((r) => [
          r.name,
          r.type === 'SERVICE' ? 'Servicio' : 'Tratamiento',
          r.count,
        ]),
      },
    ],
  };
}
