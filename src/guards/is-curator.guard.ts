import type {
  AnySelectMenuInteraction,
  ButtonInteraction,
  CommandInteraction,
  GuildMember,
  Message,
  ModalSubmitInteraction,
  Role,
} from "discord.js";
import type { GuardFunction } from "discordx";

import { IsSuperUserGuardMessages } from "#messages/is-super-user.messages.js";
import { curatorRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { UsersUtility } from "#shared/embeds/user.utility.js";

export const IsSuperUser: GuardFunction<
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

  const member = argObj?.member as GuildMember;

  if (!member) {
    return false;
  }
  const username = UsersUtility.getUsername(member.user);
  const avatar = UsersUtility.getAvatar(member.user);
  const embed = new EmbedBuilder()
    .setThumbnail(avatar)
    .setFooter({ text: username, iconURL: avatar });

  const role = await curatorRolesRepository.findByGuildId(guild.id);

  if (!role) {
    return argObj.reply({
      embeds: [
        embed
          .setTitle(IsSuperUserGuardMessages.role.title)
          .setDescription(IsSuperUserGuardMessages.role.description),
      ],
      ephemeral: true,
    });
  }

  if (!member.roles.cache.some((r: Role) => role.roleId == r.id)) {
    return argObj.reply({
      embeds: [
        embed
          .setTitle(IsSuperUserGuardMessages.forbidden.title)
          .setDescription(
            IsSuperUserGuardMessages.forbidden.description(role.roleId)
          ),
      ],
      ephemeral: true,
    });
  }

  return await next();
};
