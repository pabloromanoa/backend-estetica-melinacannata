import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const DNI_PATTERN = /^\d{7,9}$/;
export const PHONE_PATTERN = /^\+?[\d\s()-]{8,20}$/;

export class LoginDto {
  @ApiProperty({ example: 'cliente@mail.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}

export class PersonDataDto {
  @ApiProperty({ example: 'Florencia' })
  @IsString()
  @Length(1, 100)
  firstName: string;

  @ApiProperty({ example: 'Benítez' })
  @IsString()
  @Length(1, 100)
  lastName: string;

  @ApiProperty({
    example: '38491024',
    description: 'Se aceptan puntos/espacios; se guardan sólo dígitos',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[.\s-]/g, '') : value,
  )
  @Matches(DNI_PATTERN, { message: 'DNI inválido (7 a 9 dígitos, sin puntos)' })
  dni: string;

  @ApiProperty({ example: '+54 9 11 4829-1102' })
  @Matches(PHONE_PATTERN, { message: 'Teléfono inválido' })
  phone: string;
}

export class RegisterDto extends PersonDataDto {
  @ApiProperty({ example: 'florencia@mail.com' })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128)
  password: string;
}

export class GuestDataDto extends PersonDataDto {
  @ApiPropertyOptional({ example: 'florencia@mail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  @MaxLength(190)
  email?: string;
}
