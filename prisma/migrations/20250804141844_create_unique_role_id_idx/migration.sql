/*
  Warnings:

  - A unique constraint covering the columns `[roleId]` on the table `Curator` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Curator_roleId_key" ON "public"."Curator"("roleId");
