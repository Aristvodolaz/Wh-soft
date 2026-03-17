import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1710000000002 implements MigrationInterface {
  name = 'CreateUsers1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Role enum
    await queryRunner.query(`
      CREATE TYPE "public"."user_role_enum" AS ENUM (
        'SUPER_ADMIN',
        'WAREHOUSE_ADMIN',
        'MANAGER',
        'WORKER',
        'ANALYST'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"       UUID          NOT NULL,
        "email"           VARCHAR(255),
        "password_hash"   VARCHAR(255),
        "pin_hash"        VARCHAR(255),
        "first_name"      VARCHAR(100)  NOT NULL,
        "last_name"       VARCHAR(100)  NOT NULL,
        "role"            "public"."user_role_enum" NOT NULL DEFAULT 'WORKER',
        "is_active"       BOOLEAN       NOT NULL DEFAULT true,
        "last_login_at"   TIMESTAMPTZ,
        "refresh_token_hash" VARCHAR(255),
        "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "fk_users_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_users_email_per_tenant" UNIQUE ("tenant_id", "email"),
        CONSTRAINT "chk_users_auth_method" CHECK (
          "email" IS NOT NULL OR "pin_hash" IS NOT NULL
        )
      )
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX "idx_users_tenant_id" ON "users" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_email" ON "users" ("email") WHERE "email" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_role" ON "users" ("tenant_id", "role")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_is_active" ON "users" ("tenant_id", "is_active")
    `);

    // Auto-update updated_at trigger
    await queryRunner.query(`
      CREATE TRIGGER "trg_users_updated_at"
      BEFORE UPDATE ON "users"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_users_updated_at" ON "users"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role_enum"`);
  }
}
