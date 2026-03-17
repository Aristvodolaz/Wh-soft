import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env for CLI usage (migration:generate, migration:run, etc.)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * TypeORM DataSource for CLI operations.
 * Used by: npm run migration:generate / migration:run / migration:revert
 *
 * Import this in typeorm CLI via nest-cli.json or package.json scripts.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'wms_user',
  password: process.env.DB_PASSWORD ?? 'wms_password',
  database: process.env.DB_NAME ?? 'wms_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.resolve(__dirname, '../../**/*.entity{.ts,.js}')],
  migrations: [path.resolve(__dirname, './migrations/*{.ts,.js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: process.env.APP_ENV === 'development',
});
