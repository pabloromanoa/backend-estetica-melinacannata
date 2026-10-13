import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import { DomainError, DomainErrorKind } from '../../domain/domain-error';

const STATUS_BY_KIND: Record<DomainErrorKind, HttpStatus> = {
  VALIDATION: HttpStatus.BAD_REQUEST,
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
  BUSINESS_RULE: HttpStatus.UNPROCESSABLE_ENTITY,
};

const CODE_BY_STATUS: Partial<Record<number, string>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'TOO_MANY_REQUESTS',
};

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Traduce cualquier excepción al formato `{ error: { code, message, details } }`. */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toHttp(exception);
    if (status >= 500) this.logger.error(exception);
    response.status(status).json(body);
  }

  private toHttp(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_BY_KIND[exception.kind],
        body: {
          error: { code: exception.code, message: exception.message, details: exception.details },
        },
      };
    }
    if (exception instanceof ThrottlerException) {
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        body: {
          error: { code: 'TOO_MANY_REQUESTS', message: 'Demasiados intentos, probá en un rato' },
        },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const raw = typeof res === 'string' ? res : (res as { message?: unknown }).message;
      const details = Array.isArray(raw) ? raw : undefined;
      const message = Array.isArray(raw) ? 'Datos inválidos' : String(raw ?? exception.message);
      return {
        status,
        body: { error: { code: CODE_BY_STATUS[status] ?? 'HTTP_ERROR', message, details } },
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { error: { code: 'INTERNAL_ERROR', message: 'Error inesperado del servidor' } },
    };
  }
}
