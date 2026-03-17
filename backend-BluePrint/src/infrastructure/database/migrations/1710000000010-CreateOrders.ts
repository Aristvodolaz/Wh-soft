import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrders1710000000010 implements MigrationInterface {
  name = 'CreateOrders1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Order direction enum
    await queryRunner.query(`
      CREATE TYPE "public"."order_type_enum" AS ENUM (
        'INBOUND',
        'OUTBOUND',
        'TRANSFER',
        'RETURN'
      )
    `);

    // Full order lifecycle state machine
    await queryRunner.query(`
      CREATE TYPE "public"."order_status_enum" AS ENUM (
        'DRAFT',
        'CONFIRMED',
        'IN_PICKING',
        'PICKED',
        'IN_PACKING',
        'PACKED',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'RETURNED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"        UUID          NOT NULL,
        "warehouse_id"     UUID          NOT NULL,
        "order_number"     VARCHAR(100)  NOT NULL,
        "type"             "public"."order_type_enum"   NOT NULL DEFAULT 'OUTBOUND',
        "status"           "public"."order_status_enum" NOT NULL DEFAULT 'DRAFT',
        "customer_name"    VARCHAR(255),
        "customer_email"   VARCHAR(255),
        "customer_phone"   VARCHAR(50),
        "shipping_address" JSONB,
        "notes"            TEXT,
        "priority"         SMALLINT      NOT NULL DEFAULT 5,
        "expected_at"      TIMESTAMPTZ,
        "confirmed_at"     TIMESTAMPTZ,
        "shipped_at"       TIMESTAMPTZ,
        "delivered_at"     TIMESTAMPTZ,
        "cancelled_at"     TIMESTAMPTZ,
        "created_by"       UUID,
        "confirmed_by"     UUID,
        "metadata"         JSONB         NOT NULL DEFAULT '{}',
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_orders" PRIMARY KEY ("id"),
        CONSTRAINT "fk_orders_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_orders_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_orders_created_by" FOREIGN KEY ("created_by")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_orders_confirmed_by" FOREIGN KEY ("confirmed_by")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "uq_orders_number_per_tenant" UNIQUE ("tenant_id", "order_number"),
        CONSTRAINT "chk_orders_priority" CHECK ("priority" BETWEEN 1 AND 10)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_tenant_id" ON "orders" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_warehouse_id" ON "orders" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_status" ON "orders" ("warehouse_id", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_type_status" ON "orders" ("tenant_id", "type", "status")
    `);

    // High-priority active orders lookup
    await queryRunner.query(`
      CREATE INDEX "idx_orders_priority" ON "orders" ("warehouse_id", "priority" DESC, "created_at" ASC)
        WHERE "status" NOT IN ('DELIVERED', 'CANCELLED', 'RETURNED')
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_orders_created_by" ON "orders" ("created_by")
        WHERE "created_by" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_orders_updated_at"
      BEFORE UPDATE ON "orders"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_orders_updated_at" ON "orders"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_type_enum"`);
  }
}
