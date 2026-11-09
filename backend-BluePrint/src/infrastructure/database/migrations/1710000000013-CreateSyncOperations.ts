import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotency ledger for the offline terminal contour.
 * One row per client-generated operation id; UNIQUE (tenant_id, op_id) guarantees that a
 * retried batch can never apply the same operation twice.
 */
export class CreateSyncOperations1710000000013 implements MigrationInterface {
  name = 'CreateSyncOperations1710000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sync_operations" (
        "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
        "tenant_id"         UUID         NOT NULL,
        "op_id"             UUID         NOT NULL,
        "device_id"         VARCHAR(100) NOT NULL,
        "user_id"           UUID         NOT NULL,
        "type"              VARCHAR(50)  NOT NULL,
        "status"            VARCHAR(20)  NOT NULL DEFAULT 'PROCESSING',
        "response"          JSONB,
        "client_created_at" TIMESTAMPTZ,
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),

        CONSTRAINT "pk_sync_operations" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sync_operations_tenant_op" UNIQUE ("tenant_id", "op_id"),
        CONSTRAINT "ck_sync_operations_status"
          CHECK ("status" IN ('PROCESSING', 'APPLIED', 'REJECTED')),
        CONSTRAINT "fk_sync_operations_tenant" FOREIGN KEY ("tenant_id")
          REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_sync_operations_device" ON "sync_operations" ("tenant_id", "device_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE TRIGGER "trg_sync_operations_updated_at"
      BEFORE UPDATE ON "sync_operations"
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "trg_sync_operations_updated_at" ON "sync_operations"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sync_operations_device"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sync_operations"`);
  }
}
