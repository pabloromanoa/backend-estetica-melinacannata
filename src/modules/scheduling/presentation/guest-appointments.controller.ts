import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../../shared/infrastructure/auth/auth.decorators';
import { AppointmentQueries } from '../application/appointment-queries.service';
import { AppointmentView } from '../application/appointment.views';
import { CancelAppointmentUseCase } from '../application/cancel-appointment.use-case';
import { UploadReceiptUseCase } from '../application/upload-receipt.use-case';
import { CancelDto } from './dto/scheduling.dto';
import { RECEIPT_UPLOAD_OPTIONS, ReceiptUploadDto, toUploadedReceipt } from './receipt-upload';

/** Acceso por enlace privado para reservas hechas como invitado. */
@ApiTags('Turnos · Invitado')
@Public()
@Throttle({ default: { limit: 30, ttl: 60_000 } })
@Controller('guest/appointments/:token')
export class GuestAppointmentsController {
  constructor(
    private readonly queries: AppointmentQueries,
    private readonly uploadReceipt: UploadReceiptUseCase,
    private readonly cancelUseCase: CancelAppointmentUseCase,
  ) {}

  @Get()
  get(@Param('token') token: string): Promise<AppointmentView> {
    return this.queries.get({ kind: 'guest', token });
  }

  @Post('receipt')
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ReceiptUploadDto })
  @UseInterceptors(FileInterceptor('file', RECEIPT_UPLOAD_OPTIONS))
  receipt(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<AppointmentView> {
    return this.uploadReceipt.execute({ kind: 'guest', token }, toUploadedReceipt(file));
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param('token') token: string, @Body() dto: CancelDto): Promise<AppointmentView> {
    return this.cancelUseCase.execute({ kind: 'guest', token }, dto.reason ?? null);
  }
}
