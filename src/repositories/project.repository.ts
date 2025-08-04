import type { Snowflake } from "discord.js";
import { injectable } from "tsyringe";

import { prisma } from "#shared/prisma/client.js";

@injectable()
export class ProjectRepository {
  async findByTitle(guildId: Snowflake, title: string) {
    return await prisma.project.findFirst({
      where: {
        guildId,
        title: {
          equals: title.trim(),
          mode: "insensitive",
        },
      },
    });
  }

  async findById(id: number) {
    return await prisma.project.findUnique({
      where: {
        id,
      },
      include: {
        curator: true,
      },
    });
  }

  async createProject(guildId: Snowflake, title: string, poster: string) {
    return await prisma.project.create({
      data: {
        guildId,
        title,
        poster,
      },
    });
  }

  async assignCurator(projectId: number, curatorId: number) {
    return await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        curatorId: curatorId,
      },
      include: {
        curator: true,
      },
    });
  }

  async unlinkMessage(messageId: Snowflake) {
    return await prisma.project.updateMany({
      where: {
        messageId: messageId,
      },
      data: {
        messageId: null,
        branchId: null,
        channelId: null,
      },
    });
  }

  async unlinkCurator(projectId: number) {
    return await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        curatorId: null,
      },
      include: {
        curator: true,
      },
    });
  }
}
