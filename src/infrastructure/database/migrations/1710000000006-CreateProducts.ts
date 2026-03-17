import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1710000000006 implements MigrationInterface {
  name = 'CreateProducts1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Unit-of-measure enum
    await queryRunner.query(`
      CREATE TYPE "public"."product_unit_enum" AS ENUM (
        'PIECE',
        'BOX',
        'PALLET',
        'KG',
        'LITER',
        'METER'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"        UUID          NOT NULL,
        "sku"              VARCHAR(100)  NOT NULL,
        "name"             VARCHAR(255)  NOT NULL,
        "description"      TEXT,
        "barcode"          VARCHAR(100),
        "unit"             "public"."product_unit_enum" NOT NULL DEFAULT 'PIECE',
        "weight"           NUMERIC(10,3),
        "volume"           NUMERIC(10,3),
        "min_stock_level"  INTEGER       NOT NULL DEFAULT 0,
        "max_stock_level"  INTEGER,
        "reorder_point"    INTEGER       NOT NULL DEFAULT 0,
        "attributes"       JSONB         NOT NULL DEFAULT '{}',
        "is_active"        BOOLEAN       NOT NULL DEFAULT true,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_products" PRIMARY KEY ("id"),
        CONSTRAINT "fk_products_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_products_sku_per_tenant" UNIQUE ("tenant_id", "sku"),
        CONSTRAINT "chk_products_min_stock" CHECK ("min_stock_level" >= 0),
        CONSTRAINT "chk_products_reorder_point" CHECK ("reorder_point" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_products_tenant_id" ON "products" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_products_sku" ON "products" ("tenant_id", "sku")
    `);

    // Partial unique index: barcode globally unique per tenant when set
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_products_barcode_per_tenant"
        ON "products" ("tenant_id", "barcode")
        WHERE "barcode" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_products_is_active" ON "products" ("tenant_id", "is_active")
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_products_updated_at"
      BEFORE UPDATE ON "products"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_products_updated_at" ON "products"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_products_barcode_per_tenant"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_sku"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."product_unit_enum"`);
  }
}
