import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWarehouses1710000000003 implements MigrationInterface {
  name = 'CreateWarehouses1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "warehouses" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"   UUID          NOT NULL,
        "name"        VARCHAR(255)  NOT NULL,
        "code"        VARCHAR(50)   NOT NULL,
        "address"     TEXT,
        "city"        VARCHAR(100),
        "country"     VARCHAR(100),
        "timezone"    VARCHAR(50)   NOT NULL DEFAULT 'UTC',
        "is_active"   BOOLEAN       NOT NULL DEFAULT true,
        "settings"    JSONB         NOT NULL DEFAULT '{}',
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_warehouses" PRIMARY KEY ("id"),
        CONSTRAINT "fk_warehouses_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_warehouses_code_per_tenant" UNIQUE ("tenant_id", "code")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_warehouses_tenant_id" ON "warehouses" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_warehouses_is_active" ON "warehouses" ("tenant_id", "is_active")
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_warehouses_updated_at"
      BEFORE UPDATE ON "warehouses"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_warehouses_updated_at" ON "warehouses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_warehouses_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_warehouses_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "warehouses"`);
  }
}
