import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCells1710000000005 implements MigrationInterface {
  name = 'CreateCells1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "cells" (
        "id"           UUID          NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"    UUID          NOT NULL,
        "warehouse_id" UUID          NOT NULL,
        "zone_id"      UUID          NOT NULL,
        "code"         VARCHAR(50)   NOT NULL,
        "barcode"      VARCHAR(100),
        "aisle"        VARCHAR(20),
        "bay"          VARCHAR(20),
        "level"        VARCHAR(20),
        "position"     VARCHAR(20),
        "max_weight"   NUMERIC(10,2),
        "max_volume"   NUMERIC(10,2),
        "is_active"    BOOLEAN       NOT NULL DEFAULT true,
        "is_occupied"  BOOLEAN       NOT NULL DEFAULT false,
        "created_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ   NOT NULL DEFAULT now(),

        CONSTRAINT "pk_cells" PRIMARY KEY ("id"),
        CONSTRAINT "fk_cells_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cells_warehouse" FOREIGN KEY ("warehouse_id")
          REFERENCES "warehouses" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cells_zone" FOREIGN KEY ("zone_id")
          REFERENCES "zones" ("id") ON DELETE CASCADE,
        CONSTRAINT "uq_cells_code_per_zone" UNIQUE ("zone_id", "code")
      )
    `);

    // Partial unique index: barcode must be globally unique when set
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_cells_barcode"
        ON "cells" ("barcode")
        WHERE "barcode" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cells_tenant_id" ON "cells" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cells_warehouse_id" ON "cells" ("warehouse_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cells_zone_id" ON "cells" ("zone_id")
    `);

    // Covering index for bulk-cell lookup by aisle+bay+level (common scan pattern)
    await queryRunner.query(`
      CREATE INDEX "idx_cells_location" ON "cells" ("warehouse_id", "aisle", "bay", "level")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_cells_is_occupied" ON "cells" ("warehouse_id", "is_occupied")
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_cells_updated_at"
      BEFORE UPDATE ON "cells"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_cells_updated_at" ON "cells"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cells_is_occupied"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cells_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cells_zone_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cells_warehouse_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cells_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_cells_barcode"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cells"`);
  }
}
