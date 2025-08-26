-- DropForeignKey
ALTER TABLE "public"."invitations" DROP CONSTRAINT "invitations_invitee_id_fkey";

-- AlterTable
ALTER TABLE "public"."invitations" ALTER COLUMN "invitee_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
