-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "paynow_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paynow_nric" VARCHAR(20),
ADD COLUMN     "paynow_phone" VARCHAR(20);
