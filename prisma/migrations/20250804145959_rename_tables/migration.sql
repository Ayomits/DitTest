/*
  Warnings:

  - You are about to drop the `Curator` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Platform` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Employee" DROP CONSTRAINT "Employee_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Platform" DROP CONSTRAINT "Platform_projectId_fkey";

-- DropTable
DROP TABLE "public"."Curator";

-- DropTable
DROP TABLE "public"."Employee";

-- DropTable
DROP TABLE "public"."Platform";

-- DropTable
DROP TABLE "public"."Project";

-- CreateTable
CREATE TABLE "public"."curator_roles" (
    "id" SERIAL NOT NULL,
    "roleId" VARCHAR(255) NOT NULL,
    "guildId" VARCHAR(255) NOT NULL,

    CONSTRAINT "curator_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "poster" TEXT NOT NULL,
    "messageId" VARCHAR(255),
    "channelId" VARCHAR(255),
    "branchId" VARCHAR(255),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employes" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,

    CONSTRAINT "employes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."platforms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "url" TEXT NOT NULL,
    "projectId" INTEGER,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "curator_roles_roleId_key" ON "public"."curator_roles"("roleId");

-- AddForeignKey
ALTER TABLE "public"."employes" ADD CONSTRAINT "employes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."platforms" ADD CONSTRAINT "platforms_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
