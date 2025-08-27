-- AlterTable
ALTER TABLE "public"."audit_logs" ADD COLUMN     "description" TEXT,
ADD COLUMN     "target_id" INTEGER;

-- CreateIndex
CREATE INDEX "audit_logs_target_entity_idx" ON "public"."audit_logs"("target_entity");

-- CreateIndex
CREATE INDEX "audit_logs_target_id_idx" ON "public"."audit_logs"("target_id");
