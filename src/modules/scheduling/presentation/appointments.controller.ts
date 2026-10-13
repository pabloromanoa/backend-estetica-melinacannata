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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Actor, Role } from '../../../shared/domain/role';
import {
  CurrentActor,
  OptionalAuth,
  Public,
  Roles,
} from '../../../shared/infrastructure/auth/auth.decorators';
import { AppointmentQueries } from '../application/appointment-queries.service';
import { AppointmentView } from '../application/appointment.views';
import { AvailabilityService, AvailableSlotView } from '../application/availability.service';
import {
  BookAppointmentResult,
  BookAppointmentUseCase,
} from '../application/book-appointment.use-case';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { FinishAppointmentUseCase } from '../application/finish-appointment.use-case';
import { RescheduleAppointmentUseCase } from '../application/reschedule-appointment.use-case';
import { UploadReceiptUseCase } from '../application/upload-receipt.use-case';
import {
  BookAppointmentDto,
  CancelDto,
  ListAppointmentsQueryDto,
  NextSlotsQueryDto,
  RescheduleDto,
  SlotsQueryDto,
} from './dto/scheduling.dto';
import { RECEIPT_UPLOAD_OPTIONS, ReceiptUploadDto, toUploadedReceipt } from './receipt-upload';

@ApiTags('Disponibilidad')
@Public()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('slots')
  async slots(@Query() q: SlotsQueryDto) {
    const slots = await this.availability.slots(q);
    return { date: q.date, serviceId: q.serviceId, slots };
  }

  @Get('next-slots')
  nextSlots(@Query() q: NextSlotsQueryDto): Promise<AvailableSlotView[]> {
    return this.availability.nextSlots(q);
  }
}

@ApiTags('Turnos')
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly book: BookAppointmentUseCase,
    private readonly uploadReceipt: UploadReceiptUseCase,
    private readonly cancelUseCase: CancelAppointmentUseCase,
    private readonly rescheduleUseCase: RescheduleAppointmentUseCase,
    private readonly finishUseCase: FinishAppointmentUseCase,
    private readonly queries: AppointmentQueries,
  ) {}

  @OptionalAuth()
  @Post()
  create(
    @Body() dto: BookAppointmentDto,
    @CurrentActor() actor: Actor | null,
  ): Promise<BookAppointmentResult> {
    return this.book.execute(dto, actor);
  }

  @Post(':id/receipt')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReceiptUploadDto })
  @UseInterceptors(FileInterceptor('file', RECEIPT_UPLOAD_OPTIONS))
  receipt(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.uploadReceipt.execute(
      { kind: 'session', appointmentId: id, actor },
      toUploadedReceipt(file),
    );
  }

  @Roles(Role.ADMIN, Role.PROVIDER)
  @Get()
  list(
    @Query() q: ListAppointmentsQueryDto,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView[]> {
    return this.queries.list(
      { from: q.from, to: q.to, providerId: q.providerId, statuses: q.status, search: q.search },
      actor,
    );
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.queries.get({ kind: 'session', appointmentId: id, actor });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDto,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.cancelUseCase.execute(
      { kind: 'session', appointmentId: id, actor },
      dto.reason ?? null,
    );
  }

  @Roles(Role.ADMIN, Role.PROVIDER)
  @Post(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleDto,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.rescheduleUseCase.execute({ appointmentId: id, ...dto }, actor);
  }

  @Roles(Role.ADMIN, Role.PROVIDER)
  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  finish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() actor: Actor,
  ): Promise<AppointmentView> {
    return this.finishUseCase.execute(id, actor);
  }
}
