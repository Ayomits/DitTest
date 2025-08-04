/*
  Warnings:

  - Added the required column `guild_id` to the `curators` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."curators" ADD COLUMN     "guild_id" TEXT NOT NULL;
