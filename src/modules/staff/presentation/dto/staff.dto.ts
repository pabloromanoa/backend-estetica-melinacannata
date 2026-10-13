import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { DayOfWeek, ExceptionType } from '../../domain/availability';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class BankDetailsDto {
  @ApiPropertyOptional({ example: 'CAMILA.VEGA.NAILS' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  alias: string | null;
  @ApiPropertyOptional({ example: '0000003100049281749201' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  cbu: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) holder: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) cuil: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) bankName: string | null;
}

export class SetServicesDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) serviceIds: string[];
}

export class WeeklyRangeDto {
  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = domingo' })
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2, 3, 4, 5, 6])
  dayOfWeek: DayOfWeek;
  @ApiProperty({ example: '08:00' }) @Matches(TIME) startTime: string;
  @ApiProperty({ example: '13:00' }) @Matches(TIME) endTime: string;
}

export class ReplaceWeeklyDto {
  @ApiProperty({ type: [WeeklyRangeDto] })
  @IsArray()
  @ArrayMaxSize(70)
  @ValidateNested({ each: true })
  @Type(() => WeeklyRangeDto)
  ranges: WeeklyRangeDto[];
}

export class ExceptionDto {
  @ApiProperty({ example: '2026-10-13' }) @Matches(DATE) date: string;
  @ApiProperty({ enum: ExceptionType }) @IsEnum(ExceptionType) type: ExceptionType;
  @ApiPropertyOptional({ example: '14:00' }) @IsOptional() @Matches(TIME) startTime: string | null;
  @ApiPropertyOptional({ example: '18:00' }) @IsOptional() @Matches(TIME) endTime: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) reason: string | null;
}

export class DateRangeQueryDto {
  @ApiPropertyOptional({ example: '2026-10-01' }) @IsOptional() @Matches(DATE) from?: string;
  @ApiPropertyOptional({ example: '2026-10-31' }) @IsOptional() @Matches(DATE) to?: string;
}

export class CreateProviderDto {
  @ApiProperty() @IsString() @Length(1, 100) firstName: string;
  @ApiProperty() @IsString() @Length(1, 100) lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ minLength: 8 }) @IsString() @MinLength(8) @MaxLength(128) password: string;
  @ApiProperty({ example: 'Camila Vega' }) @IsString() @Length(1, 120) displayName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) specialty?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatarUrl?: string | null;
}

export class UpdateProviderDto {
  @ApiProperty() @IsString() @Length(1, 120) displayName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) specialty?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) bio?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUrl() avatarUrl?: string | null;
  @ApiProperty() @IsBoolean() isActive: boolean;
}
