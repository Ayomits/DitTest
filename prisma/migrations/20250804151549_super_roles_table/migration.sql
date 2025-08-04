/*
  Warnings:

  - You are about to drop the `curator_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."curator_roles";

-- CreateTable
CREATE TABLE "public"."super_roles" (
    "id" SERIAL NOT NULL,
    "role_id" VARCHAR(255) NOT NULL,
    "guild_id" VARCHAR(255) NOT NULL,

    CONSTRAINT "super_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."curators" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "curators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "super_roles_role_id_key" ON "public"."super_roles"("role_id");
