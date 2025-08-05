/*
  Warnings:

  - You are about to drop the column `curatorId` on the `projects` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[project_id]` on the table `curators` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[curator_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `project_id` to the `curators` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."employes" DROP CONSTRAINT "employes_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."platforms" DROP CONSTRAINT "platforms_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_curatorId_fkey";

-- AlterTable
ALTER TABLE "public"."curators" ADD COLUMN     "project_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."projects" DROP COLUMN "curatorId",
ADD COLUMN     "curator_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "curators_project_id_key" ON "public"."curators"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_curator_id_key" ON "public"."projects"("curator_id");

-- AddForeignKey
ALTER TABLE "public"."curators" ADD CONSTRAINT "curators_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employes" ADD CONSTRAINT "employes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platforms" ADD CONSTRAINT "platforms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
