import { ForbiddenError } from '../../../shared/domain/domain-error';
import { Actor, isAdmin } from '../../../shared/domain/role';

/** Datos mínimos del turno para decidir permisos. */
export interface AccessTarget {
  providerId: string;
  clientId: string;
}

/**
 * Reglas de autorización sobre turnos (quién ve y quién opera cada turno).
 * Centralizadas para no repetir condiciones en cada caso de uso.
 */
export const AppointmentAccess = {
  isOwner(actor: Actor | null, target: AccessTarget): boolean {
    return !!actor?.clientId && actor.clientId === target.clientId;
  },

  isAssignedProvider(actor: Actor | null, target: AccessTarget): boolean {
    return !!actor?.providerId && actor.providerId === target.providerId;
  },

  canManageAsStaff(actor: Actor | null, target: AccessTarget): boolean {
    return isAdmin(actor) || AppointmentAccess.isAssignedProvider(actor, target);
  },

  canView(actor: Actor | null, target: AccessTarget): boolean {
    return (
      AppointmentAccess.isOwner(actor, target) || AppointmentAccess.canManageAsStaff(actor, target)
    );
  },

  assertCanView(actor: Actor | null, target: AccessTarget): void {
    if (!AppointmentAccess.canView(actor, target)) throw new ForbiddenError();
  },

  assertStaff(actor: Actor | null, target: AccessTarget): void {
    if (!AppointmentAccess.canManageAsStaff(actor, target)) throw new ForbiddenError();
  },
};
