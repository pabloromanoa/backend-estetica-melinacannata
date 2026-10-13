import { Module } from '@nestjs/common';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { StaffModule } from '../staff/staff.module';
import { GenerateReportUseCase } from './application/generate-report.use-case';
import { GetDashboardUseCase } from './application/get-dashboard.use-case';
import { OccupancyService } from './application/occupancy.service';
import { ReportingDataSource, ReportPdfRenderer } from './domain/reporting.model';
import { PdfKitReportRenderer } from './infrastructure/pdfkit-report.renderer';
import { TypeOrmReportingDataSource } from './infrastructure/typeorm-reporting.data-source';
import { AdminReportingController } from './presentation/admin-reporting.controller';

/** Dashboard e informes (módulo de sólo lectura). */
@Module({
  imports: [SchedulingModule, StaffModule],
  controllers: [AdminReportingController],
  providers: [
    { provide: ReportingDataSource, useClass: TypeOrmReportingDataSource },
    { provide: ReportPdfRenderer, useClass: PdfKitReportRenderer },
    OccupancyService,
    GetDashboardUseCase,
    GenerateReportUseCase,
  ],
})
export class ReportingModule {}
