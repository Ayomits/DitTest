/*
  Warnings:

  - You are about to alter the column `roleId` on the `Curator` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(17)`.
  - Added the required column `guildId` to the `Curator` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Curator" ADD COLUMN     "guildId" VARCHAR(17) NOT NULL,
ALTER COLUMN "roleId" SET DATA TYPE VARCHAR(17);
