import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import { Actor, Role } from '../../../shared/domain/role';
import { CurrentActor, Roles } from '../../../shared/infrastructure/auth/auth.decorators';
import { WithMeta } from '../../../shared/infrastructure/http/response-envelope.interceptor';
import { AppointmentQueries } from '../application/appointment-queries.service';
import {
  AppointmentView,
  ClientSummaryView,
  DepositInboxItem,
} from '../application/appointment.views';
import { DayAgenda, DayAgendaQuery } from '../application/day-agenda.query';
import { ReviewDepositUseCase } from '../application/review-deposit.use-case';
import {
  ClientSearchQueryDto,
  DayQueryDto,
  DepositInboxQueryDto,
  RejectDepositDto,
} from './dto/scheduling.dto';

@ApiTags('Señas')
@Roles(Role.ADMIN, Role.PROVIDER)
@Controller('deposits')
export class DepositsController {
  constructor(
    private readonly queries: AppointmentQueries,
    private readonly review: ReviewDepositUseCase,
  ) {}

  @Get()
  async inbox(
    @Query() q: DepositInboxQueryDto,
    @CurrentActor() actor: Actor,
  ): Promise<WithMeta<DepositInboxItem[]>> {
    const { items, pendingAmount } = await this.queries.depositInbox(q.status, actor);
    return new WithMeta(items, { total: items.length, pendingAmount });
  }

  /** Sirve el PDF sólo a usuarios autorizados; nunca desde una URL pública. */
  @Get(':id/receipt')
  @ApiProduces('application/pdf')
  async receipt(@Param('id', ParseUUIDPipe) id: string, @CurrentActor() actor: Actor) {
    const content = await this.review.receipt(id, actor);
    return new StreamableFile(content, {
      type: 'application/pdf',
      disposition: `inline; filename="comprobante-${id}.pdf"`,
      length: content.length,
    });
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.review.verify(id, actor);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDepositDto,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.review.reject(id, dto.reason, actor);
  }
}

@ApiTags('Agenda')
@Roles(Role.ADMIN, Role.PROVIDER)
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agenda: DayAgendaQuery) {}

  @Get('day')
  day(@Query() q: DayQueryDto, @CurrentActor() actor: Actor): Promise<DayAgenda> {
    return this.agenda.execute(q.date, actor);
  }
}

@ApiTags('Admin · Clientes')
@Roles(Role.ADMIN)
@Controller('admin/clients')
export class AdminClientsController {
  constructor(private readonly queries: AppointmentQueries) {}

  @Get()
  search(@Query() q: ClientSearchQueryDto): Promise<ClientSummaryView[]> {
    return this.queries.searchClients(q.search ?? '');
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.queries.clientDetail(id);
  }
}
