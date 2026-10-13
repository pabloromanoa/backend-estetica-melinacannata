import { Injectable } from '@nestjs/common';
import { BusinessTime } from '../../../shared/domain/business-time';
import { Clock } from '../../../shared/domain/clock';
import { InvalidInputError } from '../../../shared/domain/domain-error';
import { MINUTES_PER_DAY } from '../../../shared/domain/interval';
import {
  agendaEfficiencyReport,
  appointmentsReport,
  cancellationsReport,
  providersReport,
  recommendationsReport,
  servicesReport,
} from '../domain/report-builders';
import {
  Period,
  ReportingDataSource,
  ReportPdfRenderer,
  ReportResult,
  ReportType,
} from '../domain/reporting.model';
import { OccupancyService } from './occupancy.service';

export const MAX_REPORT_DAYS = 366;

const TITLES: Record<ReportType, string> = {
  appointments: 'Turnos por período',
  services: 'Servicios',
  providers: 'Prestadores',
  cancellations: 'Cancelaciones',
  'agenda-efficiency': 'Eficiencia de agenda',
  recommendations: 'Recomendaciones de Laya',
};

/** Informes del administrador (JSON y exportación a PDF). */
@Injectable()
export class GenerateReportUseCase {
  constructor(
    private readonly data: ReportingDataSource,
    private readonly occupancy: OccupancyService,
    private readonly pdf: ReportPdfRenderer,
    private readonly time: BusinessTime,
    private readonly clock: Clock,
  ) {}

  async execute(type: ReportType, from: string, to: string): Promise<ReportResult> {
    BusinessTime.assertDate(from);
    BusinessTime.assertDate(to);
    if (from > to) throw new InvalidInputError('La fecha "desde" debe ser anterior a "hasta"');
    if (BusinessTime.datesBetween(from, to).length > MAX_REPORT_DAYS) {
      throw new InvalidInputError(`El período no puede superar ${MAX_REPORT_DAYS} días`);
    }
    const period: Period = {
      from: this.time.toInstant(from, 0),
      to: this.time.toInstant(to, MINUTES_PER_DAY),
    };
    const body = await this.build(type, period, from, to);
    return { type, title: TITLES[type], from, to, generatedAt: this.clock.now(), ...body };
  }

  async pdfOf(type: ReportType, from: string, to: string): Promise<Buffer> {
    return this.pdf.render(await this.execute(type, from, to));
  }

  private async build(type: ReportType, period: Period, from: string, to: string) {
    const localDate = (d: Date) => this.time.localDate(d);
    const now = this.clock.now();
    switch (type) {
      case 'appointments':
        return appointmentsReport(await this.data.appointmentsStartingIn(period), localDate);
      case 'services':
        return servicesReport(await this.data.appointmentsStartingIn(period), now);
      case 'providers': {
        const [appointments, occupancy] = await Promise.all([
          this.data.appointmentsStartingIn(period),
          this.occupancy.byProvider(from, to),
        ]);
        return providersReport(appointments, occupancy, now);
      }
      case 'cancellations': {
        const [cancelled, all] = await Promise.all([
          this.data.appointmentsCancelledIn(period),
          this.data.appointmentsStartingIn(period),
        ]);
        return cancellationsReport(cancelled, all.length, localDate);
      }
      case 'agenda-efficiency':
        return agendaEfficiencyReport(await this.occupancy.byProvider(from, to));
      case 'recommendations':
        return recommendationsReport(await this.data.recommendationsIn(period));
    }
  }
}
