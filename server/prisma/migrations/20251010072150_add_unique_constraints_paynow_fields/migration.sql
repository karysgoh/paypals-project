/*
  Warnings:

  - A unique constraint covering the columns `[paynow_phone]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paynow_nric]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "users_paynow_phone_key" ON "public"."users"("paynow_phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_paynow_nric_key" ON "public"."users"("paynow_nric");

-- CreateIndex
CREATE INDEX "users_paynow_phone_idx" ON "public"."users"("paynow_phone");

-- CreateIndex
CREATE INDEX "users_paynow_nric_idx" ON "public"."users"("paynow_nric");
