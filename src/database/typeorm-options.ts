import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';

export interface DatabaseSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  migrationsRun: boolean;
  logging: boolean;
}

/**
 * Opciones únicas de TypeORM, compartidas por la app NestJS y por la CLI de migraciones.
 * `timezone: 'Z'` guarda y lee DATETIME en UTC (la conversión a hora local es del dominio).
 */
export function buildTypeOrmOptions(db: DatabaseSettings): DataSourceOptions {
  return {
    type: 'mysql',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    timezone: 'Z',
    // Las columnas DATE se leen como 'YYYY-MM-DD' (sin conversión de zona horaria).
    dateStrings: ['DATE'],
    charset: 'utf8mb4_unicode_ci',
    synchronize: db.synchronize,
    migrationsRun: db.migrationsRun,
    logging: db.logging,
    entities: [join(__dirname, '..', '**', '*.orm-entit{y,ies}.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    migrationsTableName: 'typeorm_migrations',
  };
}
