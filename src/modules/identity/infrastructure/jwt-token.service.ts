import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Actor, Role } from '../../../shared/domain/role';
import { TokenService } from '../domain/security.ports';

interface JwtPayload {
  sub: string;
  roles: Role[];
  pid: string | null;
  cid: string | null;
}

@Injectable()
export class JwtTokenService extends TokenService {
  constructor(private readonly jwt: JwtService) {
    super();
  }

  sign(actor: Actor): Promise<string> {
    const payload: JwtPayload = {
      sub: actor.userId,
      roles: actor.roles,
      pid: actor.providerId,
      cid: actor.clientId,
    };
    return this.jwt.signAsync(payload);
  }

  async verify(token: string): Promise<Actor | null> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      return {
        userId: payload.sub,
        roles: payload.roles,
        providerId: payload.pid,
        clientId: payload.cid,
      };
    } catch {
      return null;
    }
  }
}
