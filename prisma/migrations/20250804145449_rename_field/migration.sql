/*
  Warnings:

  - You are about to drop the column `professionId` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the column `snowflake` on the `Employee` table. All the data in the column will be lost.
  - You are about to drop the `Profession` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `profession` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_professionId_fkey";

-- AlterTable
ALTER TABLE "public"."Employee" DROP COLUMN "professionId",
DROP COLUMN "snowflake",
ADD COLUMN     "profession" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "public"."Profession";
