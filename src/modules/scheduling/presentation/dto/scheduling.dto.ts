import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { GuestDataDto } from '../../../identity/presentation/dto/auth.dto';
import { AppointmentStatus } from '../../domain/appointment-status';
import { DepositStatus } from '../../domain/deposit';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class SlotsQueryDto {
  @ApiProperty() @IsUUID('4') serviceId: string;
  @ApiProperty({ example: '2026-10-25' }) @Matches(DATE) date: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') providerId?: string;
}

export class NextSlotsQueryDto {
  @ApiProperty() @IsUUID('4') serviceId: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') providerId?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(DATE) fromDate?: string;
  @ApiPropertyOptional({ default: 7 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  days = 7;
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 10;
}

export class BookAppointmentDto {
  @ApiProperty() @IsUUID('4') serviceId: string;
  @ApiProperty({ example: '2026-10-25T17:30:00.000Z' }) @Type(() => Date) @IsDate() startAt: Date;
  @ApiPropertyOptional({ description: 'Sin valor = "sin preferencia"' })
  @IsOptional()
  @IsUUID('4')
  providerId?: string;
  @ApiPropertyOptional({ type: GuestDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestDataDto)
  guest?: GuestDataDto;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') recommendationId?: string;
}

export class CancelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class RescheduleDto {
  @ApiProperty() @Type(() => Date) @IsDate() startAt: Date;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') providerId?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}

export class RejectDepositDto {
  @ApiProperty({ example: 'El archivo no es un comprobante de transferencia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ListAppointmentsQueryDto {
  @ApiProperty() @Type(() => Date) @IsDate() from: Date;
  @ApiProperty() @Type(() => Date) @IsDate() to: Date;
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') providerId?: string;
  @ApiPropertyOptional({ description: 'CSV de estados', example: 'CREATED,PAYMENT_INFORMED' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').filter(Boolean) : value,
  )
  @IsEnum(AppointmentStatus, { each: true })
  status?: AppointmentStatus[];
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}

export class DepositInboxQueryDto {
  @ApiPropertyOptional({ enum: DepositStatus, default: DepositStatus.PENDING })
  @IsOptional()
  @IsIn(Object.values(DepositStatus))
  status: DepositStatus = DepositStatus.PENDING;
}

export class DayQueryDto {
  @ApiProperty({ example: '2026-10-24' }) @Matches(DATE) date: string;
}

export class ClientSearchQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
