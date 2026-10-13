import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Acceso tipado a la configuración. El resto del código depende de esta clase
 * y nunca lee `process.env` directamente.
 */
@Injectable()
export class AppConfig {
  constructor(private readonly config: ConfigService) {}

  private get<T>(key: string): T {
    return this.config.getOrThrow<T>(key);
  }

  get isProduction(): boolean {
    return this.get<string>('NODE_ENV') === 'production';
  }
  get port(): number {
    return this.get<number>('PORT');
  }
  get frontendUrl(): string {
    return this.get<string>('FRONTEND_URL').replace(/\/$/, '');
  }
  get corsOrigins(): string[] {
    const extra = this.get<string>('CORS_ORIGINS')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    return [this.frontendUrl, ...extra];
  }

  get database() {
    return {
      host: this.get<string>('DB_HOST'),
      port: this.get<number>('DB_PORT'),
      username: this.get<string>('DB_USERNAME'),
      password: this.get<string>('DB_PASSWORD'),
      database: this.get<string>('DB_NAME'),
      synchronize: this.get<boolean>('DB_SYNCHRONIZE'),
      migrationsRun: this.get<boolean>('DB_MIGRATIONS_RUN'),
      logging: this.get<boolean>('DB_LOGGING'),
    };
  }

  get jwtSecret(): string {
    return this.get<string>('JWT_SECRET');
  }
  get jwtExpiresInSeconds(): number {
    return this.get<number>('JWT_EXPIRES_IN_SECONDS');
  }
  get cookieSecure(): boolean {
    return this.get<boolean>('COOKIE_SECURE');
  }

  get businessTimezone(): string {
    return this.get<string>('BUSINESS_TIMEZONE');
  }

  get bookingRules() {
    return {
      holdMinutes: this.get<number>('BOOKING_HOLD_MINUTES'),
      staffHoldMinutes: this.get<number>('STAFF_BOOKING_HOLD_MINUTES'),
      depositPercentage: this.get<number>('DEPOSIT_PERCENTAGE'),
      cancellationRefundHours: this.get<number>('CANCELLATION_REFUND_HOURS'),
      reminderHoursBefore: this.get<number>('REMINDER_HOURS_BEFORE'),
    };
  }

  get receipts() {
    return {
      storageDir: this.get<string>('RECEIPTS_STORAGE_DIR'),
      maxBytes: this.get<number>('RECEIPT_MAX_BYTES'),
    };
  }

  get initialAdmin() {
    return {
      email: this.get<string>('ADMIN_EMAIL'),
      password: this.get<string>('ADMIN_PASSWORD'),
      firstName: this.get<string>('ADMIN_FIRST_NAME'),
      lastName: this.get<string>('ADMIN_LAST_NAME'),
      isProvider: this.get<boolean>('ADMIN_IS_PROVIDER'),
    };
  }

  get laya() {
    return { url: this.get<string>('LAYA_URL'), timeoutMs: this.get<number>('LAYA_TIMEOUT_MS') };
  }

  get notifications() {
    return {
      provider: this.get<'log' | 'whatsapp-cloud'>('NOTIFICATIONS_PROVIDER'),
      whatsappApiUrl: this.get<string>('WHATSAPP_API_URL'),
      whatsappToken: this.get<string>('WHATSAPP_TOKEN'),
      whatsappPhoneNumberId: this.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
    };
  }

  get throttle() {
    return {
      ttlMs: this.get<number>('THROTTLE_TTL_MS'),
      limit: this.get<number>('THROTTLE_LIMIT'),
    };
  }
}
