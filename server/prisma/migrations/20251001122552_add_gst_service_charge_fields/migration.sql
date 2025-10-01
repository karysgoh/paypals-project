-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "base_amount" DECIMAL(14,2),
ADD COLUMN     "gst_amount" DECIMAL(14,2),
ADD COLUMN     "gst_rate" DECIMAL(5,4),
ADD COLUMN     "service_charge_amount" DECIMAL(14,2),
ADD COLUMN     "service_charge_rate" DECIMAL(5,4);
