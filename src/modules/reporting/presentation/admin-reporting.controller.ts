import { Controller, Get, Param, ParseEnumPipe, Query, StreamableFile } from '@nestjs/common';
import { ApiParam, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../shared/domain/role';
import { Roles } from '../../../shared/infrastructure/auth/auth.decorators';
import { Dashboard, GetDashboardUseCase } from '../application/get-dashboard.use-case';
import { GenerateReportUseCase } from '../application/generate-report.use-case';
import { REPORT_TYPES, ReportResult, ReportType } from '../domain/reporting.model';
import { ReportQueryDto } from './dto/report.dto';

const REPORT_TYPE_ENUM = Object.fromEntries(REPORT_TYPES.map((t) => [t, t]));

@ApiTags('Admin · Dashboard e informes')
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminReportingController {
  constructor(
    private readonly dashboard: GetDashboardUseCase,
    private readonly reports: GenerateReportUseCase,
  ) {}

  @Get('dashboard')
  getDashboard(): Promise<Dashboard> {
    return this.dashboard.execute();
  }

  @Get('reports/:type')
  @ApiParam({ name: 'type', enum: REPORT_TYPES })
  report(
    @Param('type', new ParseEnumPipe(REPORT_TYPE_ENUM)) type: ReportType,
    @Query() q: ReportQueryDto,
  ): Promise<ReportResult> {
    return this.reports.execute(type, q.from, q.to);
  }

  @Get('reports/:type/pdf')
  @ApiParam({ name: 'type', enum: REPORT_TYPES })
  @ApiProduces('application/pdf')
  async reportPdf(
    @Param('type', new ParseEnumPipe(REPORT_TYPE_ENUM)) type: ReportType,
    @Query() q: ReportQueryDto,
  ): Promise<StreamableFile> {
    const pdf = await this.reports.pdfOf(type, q.from, q.to);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="informe-${type}-${q.from}_${q.to}.pdf"`,
      length: pdf.length,
    });
  }
}
