import {
  ActionRowBuilder,
  type CommandInteraction,
  ModalBuilder,
  type ModalSubmitInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { inject, injectable } from "tsyringe";

import { CreateProjectMessages } from "#messages/create-project.messages.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { UsersUtility } from "#shared/embeds/user.utility.js";
import { prisma } from "#shared/prisma/client.js";
import { UrlValidator } from "#shared/validators/url.js";

import { PosterFieldId, TitleFieldId } from "./panel/panel.const.js";
import { ProjectPanel } from "./panel/panel.service.js";
import { CreateProjectModalId } from "./project.const.js";

@injectable()
export class ProjectService {
  constructor(@inject(ProjectPanel) private projectPanel: ProjectPanel) {}

  //=============Публичные команды=================
  createProjectSlash(interaction: CommandInteraction) {
    const modal = new ModalBuilder()
      .setTitle(CreateProjectMessages.modal.title)
      .setCustomId(CreateProjectModalId);

    const title = new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("title")
        .setLabel("Название проекта")
        .setMaxLength(255)
        .setPlaceholder("Атака на титанов")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
    );

    const poster = new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId("poster")
        .setLabel("Обложка проекта")
        .setMaxLength(255)
        .setPlaceholder("Вставьте сюда ссылку")
        .setRequired(true)
        .setStyle(TextInputStyle.Short)
    );

    return interaction.showModal(modal.addComponents(title, poster));
  }

  async createProjectModal(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder().setDefaults(interaction.user);

    const [title, poster] = [
      interaction.fields.getTextInputValue(TitleFieldId),
      interaction.fields.getTextInputValue(PosterFieldId),
    ];

    if (!(await UrlValidator.isImageUrl(poster))) {
      return interaction.editReply({
        embeds: [
          embed
            .setTitle(CreateProjectMessages.embed.validation.url.title)
            .setFields(
              CreateProjectMessages.embed.validation.url.fields(title, poster)
            ),
        ],
      });
    }
    const existed = await prisma.project.findFirst({
      where: {
        guildId: interaction.guild!.id,
        title,
      },
    });

    if (existed) {
      return interaction.editReply({
        embeds: [
          embed
            .setTitle(CreateProjectMessages.embed.validation.existed.title)
            .setDescription(
              CreateProjectMessages.embed.validation.existed.description(
                interaction
              )
            )
            .setFields(
              CreateProjectMessages.embed.validation.existed.fields(
                title,
                poster
              )
            ),
        ],
      });
    }

    const project = await prisma.project.create({
      data: {
        guildId: interaction.guild!.id,
        title,
        poster,
      },
      include: {
        curator: true,
      },
    });

    return await this.projectPanel.panel(interaction, project);
  }

  async updateProjectSlash(interaction: CommandInteraction, projectId: string) {
    await interaction.deferReply({ ephemeral: true });
    const numProjectId = Number(projectId);

    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar });

    if (Number.isNaN(numProjectId)) {
      // NAN error
      return interaction.editReply({
        embeds: [
          embed
            .setTitle("Ошибка")
            .setDescription("Указаннное вами значение не число"),
        ],
      });
    }

    const project = await prisma.project.findUnique({
      where: {
        id: numProjectId,
      },
    });

    if (!project) {
      // Does not exists error
      return interaction.editReply({
        embeds: [
          embed
            .setTitle("Ошибка")
            .setDescription("Указанный вами проект не найден"),
        ],
      });
    }

    return await this.projectPanel.panel(interaction, project);
  }
}
