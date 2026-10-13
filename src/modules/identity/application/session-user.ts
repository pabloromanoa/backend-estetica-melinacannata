import { Actor, Role } from '../../../shared/domain/role';
import { User } from '../domain/user';
import { LinkedProfiles } from '../domain/user.repository';

/** Datos de la sesión expuestos al frontend (`GET /auth/me`). */
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  providerId: string | null;
  clientId: string | null;
}

export interface AuthenticatedSession {
  actor: Actor;
  user: SessionUser;
}

export function buildSession(user: User, profiles: LinkedProfiles): AuthenticatedSession {
  const actor: Actor = {
    userId: user.id,
    roles: [...user.roles],
    providerId: profiles.providerId,
    clientId: profiles.clientId,
  };
  return {
    actor,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [...user.roles],
      providerId: profiles.providerId,
      clientId: profiles.clientId,
    },
  };
}
