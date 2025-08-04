/*
  Warnings:

  - Changed the type of `profession` on the `employes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `curatorId` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guild_id` to the `projects` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."Profession" AS ENUM ('TRANSLATOR', 'EDIT', 'CLEANER', 'TYPER', 'BETAREADER');

-- AlterTable
ALTER TABLE "public"."employes" DROP COLUMN "profession",
ADD COLUMN     "profession" "public"."Profession" NOT NULL;

-- AlterTable
ALTER TABLE "public"."projects" ADD COLUMN     "curatorId" INTEGER NOT NULL,
ADD COLUMN     "guild_id" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_curatorId_fkey" FOREIGN KEY ("curatorId") REFERENCES "public"."curators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
