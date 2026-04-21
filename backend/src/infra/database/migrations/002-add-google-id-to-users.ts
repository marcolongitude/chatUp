import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUsers1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const hasGoogleId = table.columns.some((col) => col.name === 'google_id');
    if (!hasGoogleId) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ADD COLUMN "google_id" varchar;
      `);
    }

    const passwordHashColumn = table.columns.find(
      (col) => col.name === 'password_hash',
    );
    if (passwordHashColumn && !passwordHashColumn.isNullable) {
      await queryRunner.query(`
        ALTER TABLE "users"
        ALTER COLUMN "password_hash" DROP NOT NULL;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    if (!table) return;

    const hasGoogleId = table.columns.some((col) => col.name === 'google_id');
    if (hasGoogleId) {
      await queryRunner.query(`
        ALTER TABLE "users"
        DROP COLUMN IF EXISTS "google_id";
      `);
    }

    const passwordHashColumn = table.columns.find(
      (col) => col.name === 'password_hash',
    );
    if (passwordHashColumn && passwordHashColumn.isNullable) {
      await queryRunner.query(`
        UPDATE "users" SET "password_hash" = '' WHERE "password_hash" IS NULL;
      `);
      await queryRunner.query(`
        ALTER TABLE "users"
        ALTER COLUMN "password_hash" SET NOT NULL;
      `);
    }
  }
}
