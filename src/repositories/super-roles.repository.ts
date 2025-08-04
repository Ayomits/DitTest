import type { Snowflake } from "discord.js";
import { injectable } from "tsyringe";

import { prisma } from "#shared/prisma/client.js";

@injectable()
export class SuperRolesRepository {
  async findByGuildId(guildId: Snowflake) {
    return await prisma.superRole.findFirst({
      where: {
        guildId: guildId,
      },
    });
  }

  async updateByGuildId(guildId: Snowflake, roleId: Snowflake) {
    return await prisma.superRole.updateMany({
      where: {
        guildId: guildId,
      },
      data: {
        roleId: roleId,
      },
    });
  }

  async updateOrCreate(roleId: Snowflake, guildId: Snowflake) {
    const existed = await this.findByGuildId(guildId);

    if (existed?.roleId == roleId) {
      return;
    }

    if (existed) {
      return await this.updateByGuildId(guildId, roleId);
    }

    return await prisma.superRole.create({
      data: {
        guildId,
        roleId,
      },
    });
  }

  async deleteCuratorRole(guildId: Snowflake) {
    return await prisma.superRole.deleteMany({
      where: {
        guildId,
      },
    });
  }
}

export const curatorRolesRepository = new SuperRolesRepository();
