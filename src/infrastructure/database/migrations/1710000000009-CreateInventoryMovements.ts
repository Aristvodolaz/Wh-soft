import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryMovements1710000000009 implements MigrationInterface {
  name = 'CreateInventoryMovements1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Movement classification enum
    await queryRunner.query(`
      CREATE TYPE "public"."movement_type_enum" AS ENUM (
        'INBOUND',
        'OUTBOUND',
        'TRANSFER',
        'ADJUSTMENT',
        'RETURN',
        'DAMAGED'
      )
    `);

    // Movement lifecycle enum
    await queryRunner.query(`
      CREATE TYPE "public"."movement_status_enum" AS ENUM (
        'PENDING',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"         UUID          NOT NULL,
        "warehouse_id"      UUID          NOT NULL,
        "product_id"        UUID          NOT NULL,
        "inventory_item_id" UUID          NOT NULL,
        "from_cell_id"      UUID,
        "to_cell_id"        UUID,
        "type"              "public"."movement_type_enum"   NOT NULL,
        "status"            "public"."movement_status_enum" NOT NULL DEFAULT 'PENDING',
        "quantity"          INTEGER       NOT NULL,
        "reference"         VARCHAR(255),
        "notes"             TEXT,
        "performed_by"      UUID,
        "completed_at"      TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_inventory_movements" PRIMARY KEY ("id"),
        CONSTRAINT "fk_movements_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_movements_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_movements_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_movements_inventory_item" FOREIGN KEY ("inventory_item_id")
          REFERENCES "inventory_items" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_movements_from_cell" FOREIGN KEY ("from_cell_id")
          REFERENCES "cells" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_movements_to_cell" FOREIGN KEY ("to_cell_id")
          REFERENCES "cells" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_movements_performed_by" FOREIGN KEY ("performed_by")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "chk_movements_quantity" CHECK ("quantity" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_movements_tenant_id" ON "inventory_movements" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_movements_warehouse_id" ON "inventory_movements" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_movements_inventory_item" ON "inventory_movements" ("inventory_item_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_movements_type_status" ON "inventory_movements" ("warehouse_id", "type", "status")
    `);

    // Audit trail index: recent movements per product
    await queryRunner.query(`
      CREATE INDEX "idx_movements_product_created" ON "inventory_movements" ("warehouse_id", "product_id", "created_at" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_movements_performed_by" ON "inventory_movements" ("performed_by")
        WHERE "performed_by" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_inventory_movements_updated_at"
      BEFORE UPDATE ON "inventory_movements"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS "trg_inventory_movements_updated_at" ON "inventory_movements"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_performed_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_product_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_inventory_item"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_movements_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory_movements"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."movement_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."movement_type_enum"`);
  }
}
