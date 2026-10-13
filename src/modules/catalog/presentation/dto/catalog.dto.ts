import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class ServiceDto {
  @ApiProperty() @IsString() @Length(1, 150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(500) imageUrl?: string | null;
  @ApiProperty({ example: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(600)
  durationMinutes: number;
  @ApiProperty({ example: 22000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;
  @ApiProperty({ example: 10 }) @Type(() => Number) @IsInt() @Min(0) @Max(120) prepMinutes: number;
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  cleanupMinutes: number;
  @ApiProperty() @IsBoolean() isActive: boolean;
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) categoryIds: string[];
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) providerIds: string[];
  @ApiProperty({ type: [String], example: ['relajacion'] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  recommendationTags: string[];
  @ApiProperty({ type: [String], example: [] })
  @IsArray()
  @ArrayMaxSize(366)
  @Matches(DATE, { each: true, message: 'Fechas en formato YYYY-MM-DD' })
  specificDates: string[];
}

export class CategoryDto {
  @ApiProperty() @IsString() @Length(1, 100) name: string;
  @ApiProperty() @IsBoolean() isActive: boolean;
}

export class TreatmentDto {
  @ApiProperty() @IsString() @Length(1, 150) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @ApiProperty() @IsBoolean() isActive: boolean;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  recommendationTags: string[];
  @ApiProperty({ type: [String], description: 'Ordenados' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  serviceIds: string[];
}

export class ServiceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID('4') categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
