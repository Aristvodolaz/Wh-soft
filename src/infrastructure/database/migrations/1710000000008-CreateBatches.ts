import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBatches1710000000008 implements MigrationInterface {
  name = 'CreateBatches1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "batches" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"         UUID          NOT NULL,
        "warehouse_id"      UUID          NOT NULL,
        "product_id"        UUID          NOT NULL,
        "batch_number"      VARCHAR(100)  NOT NULL,
        "lot_number"        VARCHAR(100),
        "quantity"          INTEGER       NOT NULL DEFAULT 0,
        "expiry_date"       DATE,
        "manufactured_date" DATE,
        "cost_price"        NUMERIC(12,4),
        "is_active"         BOOLEAN       NOT NULL DEFAULT true,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_batches" PRIMARY KEY ("id"),
        CONSTRAINT "fk_batches_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_batches_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_batches_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_batches_number_per_warehouse" UNIQUE ("warehouse_id", "batch_number"),
        CONSTRAINT "chk_batches_quantity" CHECK ("quantity" >= 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_batches_tenant_id" ON "batches" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_batches_warehouse_product" ON "batches" ("warehouse_id", "product_id")
    `);

    // Partial index for expiry monitoring
    await queryRunner.query(`
      CREATE INDEX "idx_batches_expiry" ON "batches" ("expiry_date")
        WHERE "expiry_date" IS NOT NULL AND "is_active" = true
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_batches_updated_at"
      BEFORE UPDATE ON "batches"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_batches_updated_at" ON "batches"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_batches_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_batches_warehouse_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_batches_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batches"`);
  }
}
