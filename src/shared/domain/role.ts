export enum Role {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

/**
 * Identidad del usuario autenticado en el request. Se construye a partir del JWT
 * y es lo único que la capa de aplicación conoce sobre "quién" ejecuta un caso de uso.
 */
export interface Actor {
  userId: string;
  roles: Role[];
  providerId: string | null;
  clientId: string | null;
}

export const isAdmin = (actor: Actor | null | undefined): boolean =>
  !!actor && actor.roles.includes(Role.ADMIN);

export const isProvider = (actor: Actor | null | undefined): boolean =>
  !!actor && actor.roles.includes(Role.PROVIDER) && !!actor.providerId;

export const isStaff = (actor: Actor | null | undefined): boolean =>
  isAdmin(actor) || isProvider(actor);
