import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrderItems1710000000011 implements MigrationInterface {
  name = 'CreateOrderItems1710000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Per-line-item fulfillment state
    await queryRunner.query(`
      CREATE TYPE "public"."order_item_status_enum" AS ENUM (
        'PENDING',
        'ALLOCATED',
        'PICKED',
        'PACKED',
        'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"          UUID          NOT NULL,
        "order_id"           UUID          NOT NULL,
        "product_id"         UUID          NOT NULL,
        "inventory_item_id"  UUID,
        "status"             "public"."order_item_status_enum" NOT NULL DEFAULT 'PENDING',
        "requested_quantity" INTEGER       NOT NULL,
        "allocated_quantity" INTEGER       NOT NULL DEFAULT 0,
        "picked_quantity"    INTEGER       NOT NULL DEFAULT 0,
        "unit_price"         NUMERIC(12,4),
        "notes"              TEXT,
        "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_order_items" PRIMARY KEY ("id"),
        CONSTRAINT "fk_order_items_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_order_items_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_order_items_inventory" FOREIGN KEY ("inventory_item_id")
          REFERENCES "inventory_items" ("id") ON DELETE SET NULL,
        CONSTRAINT "chk_order_items_requested" CHECK ("requested_quantity" > 0),
        CONSTRAINT "chk_order_items_allocated" CHECK ("allocated_quantity" >= 0),
        CONSTRAINT "chk_order_items_picked" CHECK ("picked_quantity" >= 0),
        CONSTRAINT "chk_order_items_allocated_lte_requested" CHECK (
          "allocated_quantity" <= "requested_quantity"
        ),
        CONSTRAINT "chk_order_items_picked_lte_allocated" CHECK (
          "picked_quantity" <= "allocated_quantity"
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_items_tenant_id" ON "order_items" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_items_order_id" ON "order_items" ("order_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_items_product_id" ON "order_items" ("product_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_items_status" ON "order_items" ("order_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_order_items_inventory" ON "order_items" ("inventory_item_id")
        WHERE "inventory_item_id" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_order_items_updated_at"
      BEFORE UPDATE ON "order_items"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_order_items_updated_at" ON "order_items"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_inventory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_product_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_order_items_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_item_status_enum"`);
  }
}
