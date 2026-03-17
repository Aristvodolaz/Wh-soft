import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenants1710000000001 implements MigrationInterface {
  name = 'CreateTenants1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Subscription plan enum
    await queryRunner.query(`
      CREATE TYPE "public"."tenant_plan_enum" AS ENUM (
        'STARTER',
        'GROWTH',
        'BUSINESS',
        'ENTERPRISE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tenants" (
        "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
        "name"         VARCHAR(255)  NOT NULL,
        "slug"         VARCHAR(100)  NOT NULL,
        "plan"         "public"."tenant_plan_enum" NOT NULL DEFAULT 'STARTER',
        "is_active"    BOOLEAN       NOT NULL DEFAULT true,
        "max_users"    INTEGER       NOT NULL DEFAULT 5,
        "max_warehouses" INTEGER     NOT NULL DEFAULT 1,
        "settings"     JSONB         NOT NULL DEFAULT '{}',
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_tenants" PRIMARY KEY ("id"),
        CONSTRAINT "uq_tenants_slug" UNIQUE ("slug")
      )
    `);

    // Index for fast slug lookup (used in onboarding / login flows)
    await queryRunner.query(`
      CREATE INDEX "idx_tenants_slug" ON "tenants" ("slug")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tenants_is_active" ON "tenants" ("is_active")
    `);

    // Auto-update updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_tenants_updated_at"
      BEFORE UPDATE ON "tenants"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_tenants_updated_at" ON "tenants"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenants_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tenants_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."tenant_plan_enum"`);
  }
}
