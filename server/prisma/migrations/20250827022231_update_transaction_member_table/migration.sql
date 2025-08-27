/*
  Warnings:

  - You are about to drop the `transaction_participants` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."transaction_participants" DROP CONSTRAINT "transaction_participants_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."transaction_participants" DROP CONSTRAINT "transaction_participants_user_id_fkey";

-- DropTable
DROP TABLE "public"."transaction_participants";

-- CreateTable
CREATE TABLE "public"."transaction_members" (
    "transaction_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount_owed" DECIMAL(14,2) NOT NULL,
    "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'unpaid',
    "payment_method" "public"."PaymentMethod",
    "external_payment_id" TEXT,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "transaction_members_pkey" PRIMARY KEY ("transaction_id","user_id")
);

-- CreateIndex
CREATE INDEX "transaction_members_user_id_idx" ON "public"."transaction_members"("user_id");

-- CreateIndex
CREATE INDEX "transaction_members_payment_status_idx" ON "public"."transaction_members"("payment_status");

-- AddForeignKey
ALTER TABLE "public"."transaction_members" ADD CONSTRAINT "transaction_members_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction_members" ADD CONSTRAINT "transaction_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
