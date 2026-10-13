import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm-options';

/** DataSource para la CLI de TypeORM (`npm run migration:*`). Lee el `.env`. */
export default new DataSource(
  buildTypeOrmOptions({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? '',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? '',
    synchronize: false,
    migrationsRun: false,
    logging: process.env.DB_LOGGING === 'true',
  }),
);
