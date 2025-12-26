/**
 * Migration to rename message columns from camelCase to snake_case
 * This migration handles the transition safely by:
 * 1. Adding new columns as nullable first
 * 2. Copying data from old columns
 * 3. Making new columns NOT NULL
 * 4. Dropping old columns
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMessageColumns1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if old columns exist
    const table = await queryRunner.getTable('messages');
    if (!table) {
      // Table doesn't exist yet, TypeORM will create it with correct schema
      return;
    }

    const hasOldColumns = table.columns.some(
      (col) => col.name === 'senderId' || col.name === 'receiverId'
    );
    const hasNewColumns = table.columns.some(
      (col) => col.name === 'sender_id' || col.name === 'receiver_id'
    );

    if (!hasOldColumns) {
      // Columns already migrated or never existed
      return;
    }

    if (hasNewColumns) {
      // Both old and new columns exist - clean up
      await queryRunner.query(`
        ALTER TABLE "messages" 
        DROP COLUMN IF EXISTS "senderId",
        DROP COLUMN IF EXISTS "receiverId",
        DROP COLUMN IF EXISTS "isDelivered",
        DROP COLUMN IF EXISTS "isRead";
      `);
      return;
    }

    // Step 1: Add new columns as nullable first
    await queryRunner.query(`
      ALTER TABLE "messages" 
      ADD COLUMN "sender_id" uuid,
      ADD COLUMN "receiver_id" uuid,
      ADD COLUMN "is_delivered" boolean DEFAULT false,
      ADD COLUMN "is_read" boolean DEFAULT false;
    `);

    // Step 2: Copy data from old columns to new columns
    await queryRunner.query(`
      UPDATE "messages" 
      SET 
        "sender_id" = "senderId",
        "receiver_id" = "receiverId",
        "is_delivered" = COALESCE("isDelivered", false),
        "is_read" = COALESCE("isRead", false)
      WHERE "senderId" IS NOT NULL;
    `);

    // Step 3: Delete any rows that couldn't be migrated (shouldn't happen, but safety check)
    await queryRunner.query(`
      DELETE FROM "messages" WHERE "sender_id" IS NULL OR "receiver_id" IS NULL;
    `);

    // Step 4: Make new columns NOT NULL
    await queryRunner.query(`
      ALTER TABLE "messages" 
      ALTER COLUMN "sender_id" SET NOT NULL,
      ALTER COLUMN "receiver_id" SET NOT NULL;
    `);

    // Step 5: Drop old columns
    await queryRunner.query(`
      ALTER TABLE "messages" 
      DROP COLUMN "senderId",
      DROP COLUMN "receiverId",
      DROP COLUMN "isDelivered",
      DROP COLUMN "isRead";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverse migration: rename back to camelCase
    const table = await queryRunner.getTable('messages');
    const hasNewColumns = table?.columns.some(
      (col) => col.name === 'sender_id' || col.name === 'receiver_id'
    );

    if (!hasNewColumns) {
      return;
    }

    // Add old columns
    await queryRunner.query(`
      ALTER TABLE "messages" 
      ADD COLUMN IF NOT EXISTS "senderId" uuid,
      ADD COLUMN IF NOT EXISTS "receiverId" uuid,
      ADD COLUMN IF NOT EXISTS "isDelivered" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "isRead" boolean DEFAULT false;
    `);

    // Copy data back
    await queryRunner.query(`
      UPDATE "messages" 
      SET 
        "senderId" = "sender_id",
        "receiverId" = "receiver_id",
        "isDelivered" = "is_delivered",
        "isRead" = "is_read";
    `);

    // Make NOT NULL
    await queryRunner.query(`
      ALTER TABLE "messages" 
      ALTER COLUMN "senderId" SET NOT NULL,
      ALTER COLUMN "receiverId" SET NOT NULL;
    `);

    // Drop new columns
    await queryRunner.query(`
      ALTER TABLE "messages" 
      DROP COLUMN IF EXISTS "sender_id",
      DROP COLUMN IF EXISTS "receiver_id",
      DROP COLUMN IF EXISTS "is_delivered",
      DROP COLUMN IF EXISTS "is_read";
    `);
  }
}

