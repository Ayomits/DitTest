import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type CommandInteraction,
  RoleSelectMenuBuilder,
  type RoleSelectMenuInteraction,
} from "discord.js";
import { inject, injectable } from "tsyringe";

import { logger } from "#logger/index.js";
import { AdminAssignRolesMessages } from "#messages/admin-assing-roles.messages.js";
import { SuperRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { UsersUtility } from "#shared/embeds/user.utility.js";

import {
  AdminAssingCuratorRoleSelectId,
  AdminRemoveCuratorRoleButtonId,
} from "./admin.const.js";

@injectable()
export class AdminService {
  constructor(
    @inject(SuperRolesRepository)
    private curatorRolesRepository: SuperRolesRepository,
  ) {}

  async assingRolesSlash(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const existed = await this.curatorRolesRepository.findByGuildId(
      interaction.guild!.id,
    );
    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setTitle(AdminAssignRolesMessages.embed.title)
      .setDescription(AdminAssignRolesMessages.embed.description)
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar })
      .setFields(AdminAssignRolesMessages.embed.fields(existed?.roleId));

    const assingRolesSelect =
      new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId(AdminAssingCuratorRoleSelectId)
          .setPlaceholder(AdminAssignRolesMessages.assingSelect.placeholder),
      );
    const removeCuratorRole =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(AdminRemoveCuratorRoleButtonId)
          .setLabel(AdminAssignRolesMessages.removeButton.label)
          .setStyle(ButtonStyle.Danger),
      );

    return interaction.editReply({
      embeds: [embed],
      components: [assingRolesSelect, removeCuratorRole],
    });
  }

  async assignCuratorRoleSelect(interaction: RoleSelectMenuInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar });
    const roleId = interaction.values[0];

    try {
      await this.curatorRolesRepository.updateOrCreate(
        roleId!,
        interaction.guild!.id,
      );
    } catch (err) {
      logger.error(err);
      return await interaction.editReply({
        embeds: [
          embed
            .setTitle(
              AdminAssignRolesMessages.assingSelect.messages.error.title,
            )
            .setDescription(
              AdminAssignRolesMessages.assingSelect.messages.error.description,
            ),
        ],
      });
    }

    return await interaction.editReply({
      embeds: [
        embed
          .setTitle(
            AdminAssignRolesMessages.assingSelect.messages.success.title,
          )
          .setDescription(
            AdminAssignRolesMessages.assingSelect.messages.success.description(
              roleId!,
            ),
          ),
      ],
    });
  }

  async deleteCuratorRoleButton(interaction: ButtonInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar });

    const existed = await this.curatorRolesRepository.findByGuildId(
      interaction.guild!.id,
    );

    if (!existed) {
      return await interaction.editReply({
        embeds: [
          embed
            .setTitle(
              AdminAssignRolesMessages.removeButton.messages.notExisted.title,
            )
            .setDescription(
              AdminAssignRolesMessages.removeButton.messages.notExisted
                .description,
            ),
        ],
      });
    }

    try {
      await this.curatorRolesRepository.deleteCuratorRole(
        interaction.guild!.id,
      );
    } catch (err) {
      logger.error(err);
      return await interaction.editReply({
        embeds: [
          embed
            .setTitle(
              AdminAssignRolesMessages.removeButton.messages.error.title,
            )
            .setDescription(
              AdminAssignRolesMessages.removeButton.messages.error.description,
            ),
        ],
      });
    }

    return await interaction.editReply({
      embeds: [
        embed
          .setTitle(
            AdminAssignRolesMessages.removeButton.messages.success.title,
          )
          .setDescription(
            AdminAssignRolesMessages.removeButton.messages.success.description,
          ),
      ],
    });
  }
}
