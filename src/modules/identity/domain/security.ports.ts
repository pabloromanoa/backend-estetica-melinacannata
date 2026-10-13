import { Actor } from '../../../shared/domain/role';

export abstract class PasswordHasher {
  abstract hash(plain: string): Promise<string>;
  abstract verify(hash: string, plain: string): Promise<boolean>;
}

export abstract class TokenService {
  abstract sign(actor: Actor): Promise<string>;
  /** Devuelve el actor o `null` si el token es inválido o expiró. */
  abstract verify(token: string): Promise<Actor | null>;
}
