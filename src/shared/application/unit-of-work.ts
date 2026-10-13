/**
 * Puerto transaccional. Los casos de uso que deben ser atómicos (p. ej. reservar un turno
 * verificando disponibilidad) ejecutan su trabajo dentro de `run`. Los repositorios de
 * infraestructura detectan la transacción activa automáticamente.
 */
export abstract class UnitOfWork {
  abstract run<T>(work: () => Promise<T>): Promise<T>;
}

/** Implementación trivial para tests unitarios con repositorios en memoria. */
export class NoopUnitOfWork extends UnitOfWork {
  run<T>(work: () => Promise<T>): Promise<T> {
    return work();
  }
}
