/**
 * Database Seeder — creates the initial tenant and super-admin user.
 *
 * Usage:
 *   npm run db:seed
 *
 * Environment:
 *   Requires a valid .env file with DB_* variables.
 *   SEED_TENANT_NAME    — tenant display name   (default: "WMS Demo")
 *   SEED_TENANT_SLUG    — tenant URL slug        (default: "wms-demo")
 *   SEED_ADMIN_EMAIL    — super admin email      (default: "admin@wms-demo.com")
 *   SEED_ADMIN_PASSWORD — super admin password   (default: "Admin1234!")
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BCRYPT_ROUNDS = 12;

async function seed(): Promise<void> {
  console.log('[Seed] Connecting to database…');
  await AppDataSource.initialize();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const tenantName = process.env.SEED_TENANT_NAME ?? 'WMS Demo';
    const tenantSlug = process.env.SEED_TENANT_SLUG ?? 'wms-demo';
    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@wms-demo.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';

    // ── Check if tenant already exists ───────────────────────────────────────
    const existingTenant = await queryRunner.query(
      `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
      [tenantSlug],
    );

    let tenantId: string;

    if (existingTenant.length > 0) {
      tenantId = existingTenant[0].id;
      console.log(`[Seed] Tenant "${tenantSlug}" already exists — skipping.`);
    } else {
      // ── Create tenant ───────────────────────────────────────────────────────
      const [newTenant] = await queryRunner.query(
        `INSERT INTO tenants (name, slug, plan, max_users, max_warehouses)
         VALUES ($1, $2, 'ENTERPRISE', 999, 999)
         RETURNING id`,
        [tenantName, tenantSlug],
      );
      tenantId = newTenant.id;
      console.log(`[Seed] ✓ Tenant created: "${tenantName}" (id: ${tenantId})`);
    }

    // ── Check if admin user already exists ───────────────────────────────────
    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
      [tenantId, adminEmail],
    );

    if (existingUser.length > 0) {
      console.log(`[Seed] Admin user "${adminEmail}" already exists — skipping.`);
    } else {
      // ── Create super admin ──────────────────────────────────────────────────
      const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);

      const [newUser] = await queryRunner.query(
        `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, 'Super', 'Admin', 'SUPER_ADMIN')
         RETURNING id`,
        [tenantId, adminEmail, passwordHash],
      );

      console.log(`[Seed] ✓ Super admin created: "${adminEmail}" (id: ${newUser.id})`);
    }

    await queryRunner.commitTransaction();
    console.log('[Seed] ✓ Seed complete.');
  } catch (err) {
    await queryRunner.rollbackTransaction();
    console.error('[Seed] ✗ Error — rolled back:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed().catch((err) => {
  console.error('[Seed] Fatal:', err);
  process.exit(1);
});
