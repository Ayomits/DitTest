import type { Prisma, Project } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  codeBlock,
  type CommandInteraction,
  type GuildMember,
  type Interaction,
  type InteractionEditReplyOptions,
  ModalBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  userMention,
  UserSelectMenuBuilder,
  type UserSelectMenuInteraction,
} from "discord.js";
import isImageUrl from "image-url-validator";
import { inject, injectable } from "tsyringe";

import { CreateProjectMessages } from "#messages/create-project.messages.js";
import { CuratorRepository } from "#repositories/curator.repository.js";
import { SuperRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { UsersUtility } from "#shared/embeds/user.utility.js";
import { prisma } from "#shared/prisma/client.js";

import {
  CreateProjectModalId,
  PlatformManagerAddId,
  PlatformManagerUpdateId,
  ProjectAssignCuratorId,
  ProjectManageEmployeeId,
  ProjectManagePlatformsId,
  ProjectPreviewId,
  ProjectPublishId,
  ProjectRemoveCuratorId,
  ProjectUpdateInfoId,
} from "./project.const.js";

@injectable()
export class ProjectService {
  constructor(
    @inject(SuperRolesRepository)
    private superRolesRepository: SuperRolesRepository,
    @inject(CuratorRepository) private curatorRepository: CuratorRepository
  ) {}

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

    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar });

    const [title, poster] = [
      interaction.fields.getTextInputValue("title"),
      interaction.fields.getTextInputValue("poster"),
    ];

    if (!(await isImageUrl.default(poster))) {
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

    return await this.panel(interaction, project);
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

    return await this.panel(interaction, project);
  }

  // ==============Управление Панелью===================
  private async panel(
    interaction: CommandInteraction | ModalSubmitInteraction,
    project: Project
  ) {
    const message = await interaction.editReply(
      // @ts-expect-error it should works correctly, but IDK what kind of type I should use, just ignore it
      await this.createPanelMessage(interaction, project)
    );
    const collector = message.createMessageComponentCollector({
      filter: async (i) => i.user.id == interaction.user.id,
      time: 600_000,
    });

    collector.on("collect", async (i) => {
      const customId = i.customId;
      const activation = await this.canActivate(i, project.id);

      const projectId = project.id;

      switch (true) {
        case customId === ProjectAssignCuratorId && activation.canActivateSuper:
          return this.assignCurator(i as UserSelectMenuInteraction, projectId);
        case customId === ProjectRemoveCuratorId && activation.canActivateSuper:
          return this.removeCurator(i as ButtonInteraction, projectId);
        case customId === ProjectManagePlatformsId &&
          activation.canActivateCurator:
          return this.platformManageButton(i as ButtonInteraction, projectId);
        case customId === ProjectPreviewId && activation.canActivateCurator:
          break;
        case customId === ProjectPublishId && activation.canActivateCurator:
          break;
        default:
          break;
      }
      return;
    });
  }

  private async createPanelMessage(
    interaction: Interaction,
    project: Prisma.ProjectGetPayload<{
      include: { curator: true };
    }>
  ): Promise<InteractionEditReplyOptions> {
    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar })
      .setImage(project.poster);

    const isSuperUser = await this.isSuperUser(interaction);
    const canAssignCurator = isSuperUser && project.curator === null;
    const canRemoveCurator = isSuperUser && project.curator !== null;

    const assignCurator =
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(ProjectAssignCuratorId)
          .setPlaceholder("Выберите куратора")
          .setDisabled(!canAssignCurator)
      );

    const manageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ProjectManageEmployeeId)
        .setLabel("Управление работниками")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ProjectManagePlatformsId)
        .setLabel("Управление платформами")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ProjectUpdateInfoId)
        .setLabel("Обновить информацию")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ProjectRemoveCuratorId)
        .setLabel("Снять куратора")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canRemoveCurator)
    );

    const messageRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ProjectPreviewId)
        .setLabel("Предпросмотр")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ProjectPublishId)
        .setLabel(
          project.messageId && project.channelId ? "Обновить" : "Опубликовать"
        )
        .setStyle(ButtonStyle.Primary)
    );

    return {
      embeds: [
        embed.setTitle("Панель управление тайтлом").setFields([
          {
            name: "Название",
            value: codeBlock(project.title),
            inline: true,
          },
          {
            name: "Ссылка на постер",
            value: codeBlock(project.poster),
            inline: true,
          },
          {
            name: "Куратор проекта",
            value: project.curator
              ? userMention(project.curator.userId)
              : codeBlock("Нет"),
          },
        ]),
      ],
      components: [assignCurator, manageRow, messageRow],
    };
  }

  // =============Управление кураторами===============
  private async assignCurator(
    interaction: UserSelectMenuInteraction,
    projectId: number
  ) {
    const userId = interaction.values[0];
    const member = await interaction.guild?.members.fetch(userId!);

    if (member?.user.bot) {
      return interaction.reply({
        content: "Бот не может быть куратором проекта",
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();
    const curator = await this.curatorRepository.findOrCreate(
      interaction.guildId!,
      userId!
    );

    const newProject = await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        curatorId: curator.id,
      },
      include: {
        curator: true,
      },
    });

    return await interaction.editReply(
      await this.createPanelMessage(interaction, newProject)
    );
  }

  private async removeCurator(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferUpdate();

    const newProject = await prisma.project.update({
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

    await interaction.editReply(
      await this.createPanelMessage(interaction, newProject)
    );
  }

  // =============Управление работниками==========

  // ==============Управление платформами==========

  // private async addPlatformButton() {}

  // private async updatePlatformButton() {}

  // private async deletePlatformButton() {}

  private async platformManageButton(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const message = await interaction.editReply(
      await this.createPlatformManageMessage(interaction, projectId)
    );

    const collector = message.createMessageComponentCollector({
      time: 600_000,
    });

    collector.on("collect", async (i) => {
      const customId = i.customId;
      const activation = await this.canActivate(i, projectId);

      switch (true) {
        case customId == PlatformManagerAddId && activation.canActivateCurator:
          break;
        default:
          break;
      }
    });
  }

  private async createPlatformManageMessage(
    interaction: ButtonInteraction,
    projectId: number
  ): Promise<InteractionEditReplyOptions> {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        platforms: true,
      },
    });

    const username = UsersUtility.getUsername(interaction.user);
    const avatar = UsersUtility.getAvatar(interaction.user);
    const embed = new EmbedBuilder()
      .setThumbnail(avatar)
      .setFooter({ text: username, iconURL: avatar });

    const platforms =
      project?.platforms
        .slice(0, 25)
        .map((platform) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(platform.name)
            .setValue(platform.id.toString())
        ) ?? [];

    const updateProjectSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(PlatformManagerUpdateId)
          .setPlaceholder("Платформа для обновления")
          .setOptions(platforms)
      );

    const deleteProjectSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(PlatformManagerAddId)
          .setPlaceholder("Платформа для удаления")
          .setOptions(platforms)
      );

    const addPlatform = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PlatformManagerAddId)
        .setLabel("Добавить платформу")
        .setStyle(ButtonStyle.Success)
    );

    const components =
      platforms.length > 0
        ? [updateProjectSelect, deleteProjectSelect, addPlatform]
        : [addPlatform];

    return {
      embeds: [embed],
      components: components,
    };
  }

  // ===============Проверка прав===============
  private async isSuperUser(interaction: Interaction) {
    const existed = await this.superRolesRepository.findByGuildId(
      interaction.guild!.id
    );

    if (!interaction.guild || !interaction.member || !existed) {
      return false;
    }

    const member = interaction.member as GuildMember;

    return member.roles.cache.some((r) => existed.roleId == r.id);
  }

  private async canActivate(interaction: Interaction, projectId: number) {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
      },
      include: {
        curator: true,
      },
    });

    const isSuperUser = await this.isSuperUser(interaction);
    const isProjectExists = !!project;
    const isCurator =
      interaction.member && interaction.guild
        ? (interaction.member as GuildMember).roles.cache.some(
            (r) => r.id == project?.curator?.userId
          )
        : false;

    return {
      isProjectExists,
      isSuperUser,
      isCurator,
      canActivateCurator: isProjectExists && (isSuperUser || isCurator),
      canActivateSuper: isProjectExists && isSuperUser,
    };
  }

  // private processEmployee() {}
  // private processPlatforms() {}
  // private async assignChannel() {}
  // private async unlink() {}
}
