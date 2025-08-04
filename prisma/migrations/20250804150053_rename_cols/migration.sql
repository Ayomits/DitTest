/*
  Warnings:

  - You are about to drop the column `guildId` on the `curator_roles` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `curator_roles` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `employes` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `platforms` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `channelId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `messageId` on the `projects` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[role_id]` on the table `curator_roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guild_id` to the `curator_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `curator_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `employes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."employes" DROP CONSTRAINT "employes_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."platforms" DROP CONSTRAINT "platforms_projectId_fkey";

-- DropIndex
DROP INDEX "public"."curator_roles_roleId_key";

-- AlterTable
ALTER TABLE "public"."curator_roles" DROP COLUMN "guildId",
DROP COLUMN "roleId",
ADD COLUMN     "guild_id" VARCHAR(255) NOT NULL,
ADD COLUMN     "role_id" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "public"."employes" DROP COLUMN "projectId",
ADD COLUMN     "project_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."platforms" DROP COLUMN "projectId",
ADD COLUMN     "project_id" INTEGER;

-- AlterTable
ALTER TABLE "public"."projects" DROP COLUMN "branchId",
DROP COLUMN "channelId",
DROP COLUMN "messageId",
ADD COLUMN     "branch_id" VARCHAR(255),
ADD COLUMN     "channel_id" VARCHAR(255),
ADD COLUMN     "message_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "curator_roles_role_id_key" ON "public"."curator_roles"("role_id");

-- AddForeignKey
ALTER TABLE "public"."employes" ADD CONSTRAINT "employes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platforms" ADD CONSTRAINT "platforms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
