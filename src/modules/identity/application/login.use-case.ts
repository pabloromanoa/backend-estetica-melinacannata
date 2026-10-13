import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/domain/domain-error';
import { PasswordHasher } from '../domain/security.ports';
import { normalizeEmail } from '../domain/user';
import { UserRepository } from '../domain/user.repository';
import { AuthenticatedSession, buildSession } from './session-user';

export class InvalidCredentialsError extends DomainError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', 'UNAUTHENTICATED');
  }
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(email: string, password: string): Promise<AuthenticatedSession> {
    const user = await this.users.findByEmail(normalizeEmail(email));
    // Mismo error para usuario inexistente o contraseña incorrecta: no revelamos qué falló.
    if (!user || !user.isActive) throw new InvalidCredentialsError();
    const valid = await this.hasher.verify(user.passwordHash, password);
    if (!valid) throw new InvalidCredentialsError();

    const profiles = await this.users.findLinkedProfiles(user.id);
    return buildSession(user, profiles);
  }
}
