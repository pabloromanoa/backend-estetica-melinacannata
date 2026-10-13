import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';

/** Resultado paginado/con metadatos que un controlador puede devolver explícitamente. */
export class WithMeta<T> {
  constructor(
    public readonly data: T,
    public readonly meta: Record<string, unknown>,
  ) {}
}

/**
 * Envuelve toda respuesta exitosa en `{ data }` (o `{ data, meta }`), según la convención
 * de la API. Los archivos (`StreamableFile`) y respuestas vacías pasan sin cambios.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((body: unknown) => {
        if (body === undefined || body instanceof StreamableFile) return body;
        if (body instanceof WithMeta) return { data: body.data, meta: body.meta };
        if (Array.isArray(body)) return { data: body, meta: { total: body.length } };
        return { data: body };
      }),
    );
  }
}
