import { Injectable } from '@nestjs/common';
import { CookieOptions, Response } from 'express';
import { AppConfig } from '../../../config/app-config';

export const ACCESS_TOKEN_COOKIE = 'access_token';

/** Emite/borra la cookie de sesión: HttpOnly, SameSite=Lax y Secure en producción. */
@Injectable()
export class AuthCookie {
  constructor(private readonly config: AppConfig) {}

  private get options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.cookieSecure,
      sameSite: 'lax',
      path: '/',
    };
  }

  set(res: Response, token: string): void {
    res.cookie(ACCESS_TOKEN_COOKIE, token, {
      ...this.options,
      maxAge: this.config.jwtExpiresInSeconds * 1000,
    });
  }

  clear(res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.options);
  }
}
