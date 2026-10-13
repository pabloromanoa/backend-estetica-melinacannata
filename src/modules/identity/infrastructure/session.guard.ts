import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainError, ForbiddenError } from '../../../shared/domain/domain-error';
import { Role } from '../../../shared/domain/role';
import {
  ACCESS_KEY,
  AccessMode,
  RequestWithActor,
  ROLES_KEY,
} from '../../../shared/infrastructure/auth/auth.decorators';
import { TokenService } from '../domain/security.ports';
import { ACCESS_TOKEN_COOKIE } from './auth-cookie';

/**
 * Guard global. Por defecto TODO endpoint requiere sesión (seguro por defecto);
 * `@Public()` y `@OptionalAuth()` lo relajan explícitamente. Luego valida `@Roles()`.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const targets = [context.getHandler(), context.getClass()];
    const access = this.reflector.getAllAndOverride<AccessMode | undefined>(ACCESS_KEY, targets);
    const request = context.switchToHttp().getRequest<RequestWithActor>();

    const token = request.cookies?.[ACCESS_TOKEN_COOKIE];
    const actor = token ? await this.tokens.verify(token) : null;
    if (actor) request.actor = actor;

    if (access === 'public' || access === 'optional') return true;
    if (!actor) {
      throw new DomainError('UNAUTHENTICATED', 'Necesitás iniciar sesión', 'UNAUTHENTICATED');
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.some((role) => actor.roles.includes(role))) {
      throw new ForbiddenError();
    }
    return true;
  }
}
