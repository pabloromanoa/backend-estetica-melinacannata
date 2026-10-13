/**
 * Errores del dominio. No conocen HTTP: el filtro global (`DomainExceptionFilter`)
 * los traduce al código de estado correspondiente según su `kind`.
 */
export type DomainErrorKind =
  'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN' | 'UNAUTHENTICATED' | 'BUSINESS_RULE';

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly kind: DomainErrorKind = 'BUSINESS_RULE',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(
      'NOT_FOUND',
      id ? `${entity} ${id} no encontrado` : `${entity} no encontrado`,
      'NOT_FOUND',
    );
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'No tenés permisos para realizar esta acción') {
    super('FORBIDDEN', message, 'FORBIDDEN');
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 'CONFLICT', details);
  }
}

export class BusinessRuleError extends DomainError {
  constructor(code: string, message: string, details?: unknown) {
    super(code, message, 'BUSINESS_RULE', details);
  }
}

export class InvalidInputError extends DomainError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, 'VALIDATION', details);
  }
}
