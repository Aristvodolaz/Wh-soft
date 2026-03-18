import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryItems1710000000007 implements MigrationInterface {
  name = 'CreateInventoryItems1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "inventory_items" (
        "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"          UUID          NOT NULL,
        "warehouse_id"       UUID          NOT NULL,
        "product_id"         UUID          NOT NULL,
        "cell_id"            UUID,
        "quantity"           INTEGER       NOT NULL DEFAULT 0,
        "reserved_quantity"  INTEGER       NOT NULL DEFAULT 0,
        "lot_number"         VARCHAR(100),
        "serial_number"      VARCHAR(100),
        "expiry_date"        DATE,
        "cost_price"         NUMERIC(12,4),
        "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_inventory_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_inventory_items_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_inventory_items_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_items_cell" FOREIGN KEY ("cell_id")
          REFERENCES "cells" ("id") ON DELETE SET NULL,
        CONSTRAINT "chk_inventory_items_quantity" CHECK ("quantity" >= 0),
        CONSTRAINT "chk_inventory_items_reserved" CHECK (
          "reserved_quantity" >= 0 AND "reserved_quantity" <= "quantity"
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_items_tenant_id" ON "inventory_items" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_items_warehouse_id" ON "inventory_items" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_items_product_id" ON "inventory_items" ("warehouse_id", "product_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_items_cell_id" ON "inventory_items" ("cell_id")
        WHERE "cell_id" IS NOT NULL
    `);

    // Partial index for expiry monitoring
    await queryRunner.query(`
      CREATE INDEX "idx_inventory_items_expiry" ON "inventory_items" ("expiry_date")
        WHERE "expiry_date" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_inventory_items_updated_at"
      BEFORE UPDATE ON "inventory_items"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_inventory_items_updated_at" ON "inventory_items"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_items_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_items_cell_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_items_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_items_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_inventory_items_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_items"`);
  }
}
