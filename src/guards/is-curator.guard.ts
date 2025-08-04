import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  CommandInteraction,
  Message,
  ModalSubmitInteraction,
  Role,
} from "discord.js";
import type { GuardFunction } from "discordx";

import { curatorRolesRepository } from "#repositories/curator-roles.repository.js";

export const IsCurator: GuardFunction<
  | CommandInteraction
  | ButtonInteraction
  | Message
  | AnySelectMenuInteraction
  | ModalSubmitInteraction
> = async (params, _, next) => {
  const argObj = params instanceof Array ? params[0] : params;

  const guild = argObj?.guild;

  if (!guild) {
    return false;
  }

  const member = argObj?.member;

  if (!member) {
    return false;
  }

  const role = await curatorRolesRepository.findByGuildId(guild.id);

  if (!role) {
    return false;
  }

  if (!member.roles.some((r: Role) => role.roleId == r.id)) {
    return false;
  }

  return await next();
};
