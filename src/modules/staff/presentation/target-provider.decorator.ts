import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ForbiddenError } from '../../../shared/domain/domain-error';
import { RequestWithActor } from '../../../shared/infrastructure/auth/auth.decorators';

/**
 * Resuelve sobre qué prestador opera el endpoint:
 * - `/admin/providers/:providerId/...` → el del parámetro (el controlador exige ADMIN);
 * - `/staff/me/...` → el prestador del usuario autenticado.
 */
export const TargetProviderId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<RequestWithActor & { params: Record<string, string> }>();
    const fromRoute = request.params?.providerId;
    if (fromRoute) return fromRoute;
    const own = request.actor?.providerId;
    if (!own) throw new ForbiddenError('Tu usuario no tiene perfil de prestador');
    return own;
  },
);
