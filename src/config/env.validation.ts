import * as Joi from 'joi';

/**
 * Esquema de variables de entorno. El backend no arranca si falta algo obligatorio:
 * preferimos fallar rápido a correr con configuración insegura.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(3000),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
  CORS_ORIGINS: Joi.string().allow('').default(''),

  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().port().default(3306),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_MIGRATIONS_RUN: Joi.boolean().default(true),
  DB_LOGGING: Joi.boolean().default(false),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN_SECONDS: Joi.number()
    .integer()
    .positive()
    .default(8 * 60 * 60),
  COOKIE_SECURE: Joi.boolean().default(false),

  BUSINESS_TIMEZONE: Joi.string().default('America/Argentina/Buenos_Aires'),
  BOOKING_HOLD_MINUTES: Joi.number().integer().positive().default(5),
  STAFF_BOOKING_HOLD_MINUTES: Joi.number().integer().positive().default(30),
  DEPOSIT_PERCENTAGE: Joi.number().min(0).max(100).default(50),
  CANCELLATION_REFUND_HOURS: Joi.number().integer().min(0).default(24),
  REMINDER_HOURS_BEFORE: Joi.number().integer().positive().default(24),

  RECEIPTS_STORAGE_DIR: Joi.string().default('./storage/receipts'),
  RECEIPT_MAX_BYTES: Joi.number()
    .integer()
    .positive()
    .default(5 * 1024 * 1024),

  ADMIN_EMAIL: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  ADMIN_PASSWORD: Joi.string().min(10).required(),
  ADMIN_FIRST_NAME: Joi.string().default('Melina'),
  ADMIN_LAST_NAME: Joi.string().default('Cannata'),
  ADMIN_IS_PROVIDER: Joi.boolean().default(true),

  LAYA_URL: Joi.string().uri().allow('').default(''),
  LAYA_TIMEOUT_MS: Joi.number().integer().positive().default(3000),

  NOTIFICATIONS_PROVIDER: Joi.string().valid('log', 'whatsapp-cloud').default('log'),
  WHATSAPP_API_URL: Joi.string().uri().default('https://graph.facebook.com/v21.0'),
  WHATSAPP_TOKEN: Joi.string().allow('').default(''),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().allow('').default(''),

  THROTTLE_TTL_MS: Joi.number().integer().positive().default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(120),
});
