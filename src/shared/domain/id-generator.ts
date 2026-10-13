import { randomUUID } from 'node:crypto';

/** Puerto para generar identificadores (reemplazable en tests por uno determinístico). */
export abstract class IdGenerator {
  abstract next(): string;
}

export class UuidGenerator extends IdGenerator {
  next(): string {
    return randomUUID();
  }
}

export class SequentialIdGenerator extends IdGenerator {
  private counter = 0;
  constructor(private readonly prefix = 'id') {
    super();
  }
  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}
