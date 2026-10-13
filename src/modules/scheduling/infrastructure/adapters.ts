import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config';
import { NotFoundError } from '../../../shared/domain/domain-error';
import {
  AppointmentCodeGenerator,
  GuestTokenService,
  RandomPicker,
  ReceiptStorage,
} from '../domain/scheduling.ports';

@Injectable()
export class CryptoRandomPicker extends RandomPicker {
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('No hay elementos para elegir');
    return items[randomInt(items.length)];
  }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class RandomAppointmentCodeGenerator extends AppointmentCodeGenerator {
  next(): string {
    const suffix = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
    return `TRN-${suffix.join('')}`;
  }
}

@Injectable()
export class Sha256GuestTokenService extends GuestTokenService {
  generate(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token) };
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

const KEY_PATTERN = /^[0-9a-f-]{36}\.pdf$/;

/**
 * Comprobantes en disco, en un directorio PRIVADO (no servido estáticamente).
 * El nombre es un UUID generado por el servidor: el nombre original del usuario se descarta.
 * En producción puede reemplazarse por un bucket privado (S3/GCS) implementando el mismo puerto.
 */
@Injectable()
export class LocalReceiptStorage extends ReceiptStorage {
  private readonly dir: string;

  constructor(config: AppConfig) {
    super();
    this.dir = resolve(config.receipts.storageDir);
  }

  async save(content: Buffer): Promise<string> {
    await mkdir(this.dir, { recursive: true, mode: 0o700 });
    const key = `${randomUUID()}.pdf`;
    await writeFile(this.pathOf(key), content, { mode: 0o600, flag: 'wx' });
    return key;
  }

  async read(key: string): Promise<Buffer> {
    try {
      return await readFile(this.pathOf(key));
    } catch {
      throw new NotFoundError('Comprobante');
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true });
  }

  /** Evita path traversal: sólo claves generadas por nosotros. */
  private pathOf(key: string): string {
    if (!KEY_PATTERN.test(key)) throw new NotFoundError('Comprobante');
    return join(this.dir, key);
  }
}
