import { Role } from '../../../shared/domain/role';

/** Cuenta con credenciales (cliente registrado, prestador o administrador). */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  roles: Role[];
  isActive: boolean;
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();
