import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Actor, Role } from '../../domain/role';

export const ACCESS_KEY = 'access';
export type AccessMode = 'public' | 'optional';

/** Endpoint accesible sin sesión. */
export const Public = () => SetMetadata(ACCESS_KEY, 'public' satisfies AccessMode);

/** Endpoint accesible con o sin sesión; si hay sesión válida, se carga el `Actor`. */
export const OptionalAuth = () => SetMetadata(ACCESS_KEY, 'optional' satisfies AccessMode);

export const ROLES_KEY = 'roles';
/** Requiere al menos uno de los roles indicados. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface RequestWithActor {
  actor?: Actor;
  cookies?: Record<string, string>;
}

/** Inyecta el `Actor` autenticado (o `null` en endpoints opcionales). */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor | null =>
    ctx.switchToHttp().getRequest<RequestWithActor>().actor ?? null,
);
