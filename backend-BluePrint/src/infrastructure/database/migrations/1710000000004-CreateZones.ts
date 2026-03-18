import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateZones1710000000004 implements MigrationInterface {
  name = 'CreateZones1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Zone classification enum
    await queryRunner.query(`
      CREATE TYPE "public"."zone_type_enum" AS ENUM (
        'STORAGE',
        'RECEIVING',
        'SHIPPING',
        'STAGING',
        'RETURNS',
        'HAZMAT',
        'COLD'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "zones" (
        "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"    UUID          NOT NULL,
        "warehouse_id" UUID          NOT NULL,
        "name"         VARCHAR(255)  NOT NULL,
        "code"         VARCHAR(50)   NOT NULL,
        "type"         "public"."zone_type_enum" NOT NULL DEFAULT 'STORAGE',
        "description"  TEXT,
        "is_active"    BOOLEAN       NOT NULL DEFAULT true,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_zones" PRIMARY KEY ("id"),
        CONSTRAINT "fk_zones_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_zones_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_zones_code_per_warehouse" UNIQUE ("warehouse_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_zones_tenant_id" ON "zones" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_zones_warehouse_id" ON "zones" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_zones_type" ON "zones" ("warehouse_id", "type")
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_zones_updated_at"
      BEFORE UPDATE ON "zones"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_zones_updated_at" ON "zones"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_zones_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_zones_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_zones_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "zones"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."zone_type_enum"`);
  }
}
