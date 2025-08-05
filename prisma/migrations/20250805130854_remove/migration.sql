/*
  Warnings:

  - Changed the type of `profession` on the `employes` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "public"."employes" DROP COLUMN "profession",
ADD COLUMN     "profession" TEXT NOT NULL;

-- DropEnum
DROP TYPE "public"."Profession";
