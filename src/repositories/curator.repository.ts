import type { Curator } from "@prisma/client";
import type { Snowflake } from "discord.js";
import { injectable } from "tsyringe";

import { prisma } from "#shared/prisma/client.js";

@injectable()
export class CuratorRepository {
  async findOrCreate(guildId: Snowflake, userId: Snowflake) {
    const existed = await this.findCuratorBySnowflake(guildId, userId);

    if (existed) {
      return existed;
    }

    return await this.createCurator({ userId, guildId });
  }

  async findCuratorBySnowflake(guildId: Snowflake, userId: Snowflake) {
    return await prisma.curator.findFirst({
      where: {
        userId,
        guildId,
      },
    });
  }

  async createCurator(payload: Omit<Curator, "id">) {
    return await prisma.curator.create({
      data: payload,
    });
  }
}
