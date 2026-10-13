import { Role } from '../../../shared/domain/role';
import { User } from './user';

export interface LinkedProfiles {
  providerId: string | null;
  clientId: string | null;
}

export abstract class UserRepository {
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract existsWithRole(role: Role): Promise<boolean>;
  abstract save(user: User): Promise<void>;
  /** Perfiles asociados al usuario (prestador y/o cliente). */
  abstract findLinkedProfiles(userId: string): Promise<LinkedProfiles>;
}
