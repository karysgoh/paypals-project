/*
  Warnings:

  - The primary key for the `transaction_members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[transaction_id,user_id,external_email]` on the table `transaction_members` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."transaction_members" DROP CONSTRAINT "transaction_members_pkey",
ADD COLUMN     "access_token" TEXT,
ADD COLUMN     "access_token_expires" TIMESTAMP(3),
ADD COLUMN     "external_email" TEXT,
ADD COLUMN     "external_name" TEXT,
ADD COLUMN     "id" SERIAL NOT NULL,
ADD COLUMN     "is_external" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "user_id" DROP NOT NULL,
ADD CONSTRAINT "transaction_members_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "transaction_members_external_email_idx" ON "public"."transaction_members"("external_email");

-- CreateIndex
CREATE INDEX "transaction_members_access_token_idx" ON "public"."transaction_members"("access_token");

-- CreateIndex
CREATE INDEX "transaction_members_is_external_idx" ON "public"."transaction_members"("is_external");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_members_transaction_id_user_id_external_email_key" ON "public"."transaction_members"("transaction_id", "user_id", "external_email");
