/*
  Warnings:

  - You are about to drop the column `category_id` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the `transaction_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."TransactionCategoryEnum" AS ENUM ('food', 'travel', 'entertainment', 'shopping', 'transportation', 'utilities', 'rent', 'groceries', 'healthcare', 'education', 'other');

-- DropForeignKey
ALTER TABLE "public"."transactions" DROP CONSTRAINT "transactions_category_id_fkey";

-- AlterTable
ALTER TABLE "public"."transactions" DROP COLUMN "category_id",
DROP COLUMN "location",
ADD COLUMN     "category" "public"."TransactionCategoryEnum" NOT NULL DEFAULT 'other',
ADD COLUMN     "formatted_address" TEXT,
ADD COLUMN     "location_lat" DECIMAL(10,8),
ADD COLUMN     "location_lng" DECIMAL(11,8),
ADD COLUMN     "location_name" TEXT,
ADD COLUMN     "place_id" TEXT;

-- DropTable
DROP TABLE "public"."transaction_categories";
