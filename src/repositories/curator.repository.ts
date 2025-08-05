import type { Curator } from "@prisma/client";
import type { Snowflake } from "discord.js";
import { injectable } from "tsyringe";

import { prisma } from "#shared/prisma/client.js";

@injectable()
export class CuratorRepository {
  async findOrCreate(guildId: Snowflake, userId: Snowflake, projectId: number) {
    const existed = await this.findCuratorBySnowflake(userId, projectId);

    if (existed) {
      return existed;
    }

    return await this.createCurator({ userId, guildId, projectId });
  }

  async findCuratorBySnowflake(userId: Snowflake, projectId: number) {
    return await prisma.curator.findFirst({
      where: {
        userId,
        projectId
      },
    });
  }

  async createCurator(payload: Omit<Curator, "id">) {
    return await prisma.curator.create({
      data: payload,
    });
  }
}
