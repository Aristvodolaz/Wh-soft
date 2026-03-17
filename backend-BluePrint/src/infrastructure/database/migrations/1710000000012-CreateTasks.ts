import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTasks1710000000012 implements MigrationInterface {
  name = 'CreateTasks1710000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // What kind of warehouse operation is this task
    await queryRunner.query(`
      CREATE TYPE "public"."task_type_enum" AS ENUM (
        'PICK',
        'PACK',
        'RECEIVE',
        'PUT_AWAY',
        'TRANSFER',
        'COUNT',
        'INSPECT',
        'REPLENISH'
      )
    `);

    // Task lifecycle state machine
    await queryRunner.query(`
      CREATE TYPE "public"."task_status_enum" AS ENUM (
        'PENDING',
        'ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'FAILED'
      )
    `);

    // Urgency level
    await queryRunner.query(`
      CREATE TYPE "public"."task_priority_enum" AS ENUM (
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id"                    UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"             UUID          NOT NULL,
        "warehouse_id"          UUID          NOT NULL,
        "order_id"              UUID,
        "inventory_movement_id" UUID,
        "type"                  "public"."task_type_enum"     NOT NULL,
        "status"                "public"."task_status_enum"   NOT NULL DEFAULT 'PENDING',
        "priority"              "public"."task_priority_enum" NOT NULL DEFAULT 'NORMAL',
        "title"                 VARCHAR(255)  NOT NULL,
        "description"           TEXT,
        "assigned_to"           UUID,
        "assigned_at"           TIMESTAMPTZ,
        "started_at"            TIMESTAMPTZ,
        "completed_at"          TIMESTAMPTZ,
        "due_at"                TIMESTAMPTZ,
        "from_cell_id"          UUID,
        "to_cell_id"            UUID,
        "product_id"            UUID,
        "quantity"              INTEGER,
        "notes"                 TEXT,
        "metadata"              JSONB         NOT NULL DEFAULT '{}',
        "created_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "fk_tasks_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_tasks_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_tasks_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_movement" FOREIGN KEY ("inventory_movement_id")
          REFERENCES "inventory_movements" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_assigned_to" FOREIGN KEY ("assigned_to")
          REFERENCES "users" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_from_cell" FOREIGN KEY ("from_cell_id")
          REFERENCES "cells" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_to_cell" FOREIGN KEY ("to_cell_id")
          REFERENCES "cells" ("id") ON DELETE SET NULL,
        CONSTRAINT "fk_tasks_product" FOREIGN KEY ("product_id")
          REFERENCES "products" ("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_tasks_quantity" CHECK ("quantity" IS NULL OR "quantity" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_tenant_id" ON "tasks" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_warehouse_id" ON "tasks" ("warehouse_id")
    `);

    // Worker inbox: tasks assigned to a specific user
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_assigned_to" ON "tasks" ("assigned_to", "status")
        WHERE "assigned_to" IS NOT NULL
    `);

    // Dispatcher view: pending tasks by warehouse ordered by urgency
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_pending_priority" ON "tasks" ("warehouse_id", "priority", "created_at" ASC)
        WHERE "status" IN ('PENDING', 'ASSIGNED')
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_type_status" ON "tasks" ("warehouse_id", "type", "status")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_order_id" ON "tasks" ("order_id")
        WHERE "order_id" IS NOT NULL
    `);

    // Overdue task detection
    await queryRunner.query(`
      CREATE INDEX "idx_tasks_due_at" ON "tasks" ("due_at")
        WHERE "due_at" IS NOT NULL AND "status" NOT IN ('COMPLETED', 'CANCELLED', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_tasks_updated_at"
      BEFORE UPDATE ON "tasks"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_tasks_updated_at" ON "tasks"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_due_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_pending_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_assigned_to"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."task_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."task_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."task_type_enum"`);
  }
}
