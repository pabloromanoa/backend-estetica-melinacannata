import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app-config';
import { ClientRegistry } from './application/client-registry.service';
import { GetSessionUseCase } from './application/get-session.use-case';
import { LoginUseCase } from './application/login.use-case';
import { RegisterClientUseCase } from './application/register-client.use-case';
import { ClientRepository } from './domain/client.repository';
import { PasswordHasher, TokenService } from './domain/security.ports';
import { UserRepository } from './domain/user.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { AuthCookie } from './infrastructure/auth-cookie';
import { ClientOrmEntity } from './infrastructure/client.orm-entity';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { SessionGuard } from './infrastructure/session.guard';
import { TypeOrmClientRepository } from './infrastructure/typeorm-client.repository';
import { TypeOrmUserRepository } from './infrastructure/typeorm-user.repository';
import { UserOrmEntity } from './infrastructure/user.orm-entity';
import { AuthController } from './presentation/auth.controller';

/** Identidad: cuentas, clientes, autenticación por cookie JWT y autorización por rol. */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, ClientOrmEntity]),
    JwtModule.registerAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        secret: config.jwtSecret,
        signOptions: { expiresIn: config.jwtExpiresInSeconds },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: UserRepository, useClass: TypeOrmUserRepository },
    { provide: ClientRepository, useClass: TypeOrmClientRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenService, useClass: JwtTokenService },
    { provide: APP_GUARD, useClass: SessionGuard },
    AuthCookie,
    RegisterClientUseCase,
    LoginUseCase,
    GetSessionUseCase,
    ClientRegistry,
  ],
  exports: [UserRepository, ClientRepository, PasswordHasher, ClientRegistry],
})
export class IdentityModule {}
