import { Injectable } from '@nestjs/common';
import { DomainError } from '../../../shared/domain/domain-error';
import { UserRepository } from '../domain/user.repository';
import { buildSession, SessionUser } from './session-user';

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<SessionUser> {
    const user = await this.users.findById(userId);
    if (!user || !user.isActive) {
      throw new DomainError('UNAUTHENTICATED', 'La sesión ya no es válida', 'UNAUTHENTICATED');
    }
    const profiles = await this.users.findLinkedProfiles(user.id);
    return buildSession(user, profiles).user;
  }
}
