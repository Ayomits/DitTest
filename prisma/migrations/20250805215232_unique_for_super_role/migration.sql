/*
  Warnings:

  - A unique constraint covering the columns `[guild_id]` on the table `super_roles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "super_roles_guild_id_key" ON "public"."super_roles"("guild_id");
