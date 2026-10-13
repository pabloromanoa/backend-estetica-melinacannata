import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Actor } from '../../../shared/domain/role';
import {
  CurrentActor,
  OptionalAuth,
  Public,
} from '../../../shared/infrastructure/auth/auth.decorators';
import { GetSessionUseCase } from '../application/get-session.use-case';
import { LoginUseCase } from '../application/login.use-case';
import { RegisterClientUseCase } from '../application/register-client.use-case';
import { SessionUser } from '../application/session-user';
import { TokenService } from '../domain/security.ports';
import { AuthCookie } from '../infrastructure/auth-cookie';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/** Límite estricto para endpoints sensibles a fuerza bruta. */
const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly register: RegisterClientUseCase,
    private readonly login: LoginUseCase,
    private readonly session: GetSessionUseCase,
    private readonly tokens: TokenService,
    private readonly cookie: AuthCookie,
  ) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  async registerClient(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SessionUser; linkedAppointments: number }> {
    const result = await this.register.execute(dto);
    this.cookie.set(res, await this.tokens.sign(result.actor));
    return { user: result.user, linkedAppointments: result.linkedAppointments };
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionUser> {
    const result = await this.login.execute(dto.email, dto.password);
    this.cookie.set(res, await this.tokens.sign(result.actor));
    return result.user;
  }

  @OptionalAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  signOut(@Res({ passthrough: true }) res: Response): void {
    this.cookie.clear(res);
  }

  @Get('me')
  me(@CurrentActor() actor: Actor): Promise<SessionUser> {
    return this.session.execute(actor.userId);
  }
}
