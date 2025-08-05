/*
  Warnings:

  - A unique constraint covering the columns `[message_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[channel_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[branch_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "projects_message_id_key" ON "public"."projects"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_channel_id_key" ON "public"."projects"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_branch_id_key" ON "public"."projects"("branch_id");
