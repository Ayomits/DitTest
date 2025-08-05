import type { Platform, Prisma, Project } from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  codeBlock,
  type CommandInteraction,
  type GuildMember,
  hyperlink,
  type Interaction,
  type InteractionEditReplyOptions,
  ModalBuilder,
  type ModalSubmitInteraction,
  quote,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  userMention,
  UserSelectMenuBuilder,
  type UserSelectMenuInteraction,
} from "discord.js";
import { inject, injectable } from "tsyringe";

import { CuratorRepository } from "#repositories/curator.repository.js";
import { SuperRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { prisma } from "#shared/prisma/client.js";
import { UrlValidator } from "#shared/validators/url.js";

import {
  PlatformIdFieldId,
  PlatformLimit,
  PlatformManagerAddButtonId,
  PlatformManagerAddModalId,
  PlatformManagerRemoveId,
  PlatformManagerUpdateId,
  PlatformManagerUpdateModalId,
  ProjectAssignCuratorId,
  ProjectDeleteCancelId,
  ProjectDeleteId,
  ProjectDeleteSubmitId,
  ProjectIdFieldId,
  ProjectManageEmployeeId,
  ProjectManagePlatformsId,
  ProjectPreviewId,
  ProjectPublishId,
  ProjectRemoveCuratorId,
  ProjectUnlinkId,
  TitleFieldId,
  UrlFieldId,
} from "./panel.const.js";

@injectable()
export class ProjectPanel {
  constructor(
    @inject(SuperRolesRepository)
    private superRolesRepository: SuperRolesRepository,
    @inject(CuratorRepository) private curatorRepository: CuratorRepository
  ) {}

  // ==============Управление Панелью===================
  async panel(
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
        // Селект для назначения куратора
        case customId === ProjectAssignCuratorId && activation.canActivateSuper:
          return this.assignCurator(i as UserSelectMenuInteraction, projectId);

        // Кнопка для удаления куратора
        case customId === ProjectRemoveCuratorId && activation.canActivateSuper:
          return this.removeCurator(i as ButtonInteraction, projectId);

        // Кнопка для управления платформами
        case customId === ProjectManagePlatformsId &&
          activation.canActivateCurator:
          return this.platformManageButton(i as ButtonInteraction, projectId);

        // Кнопка для превью
        case customId === ProjectPreviewId && activation.canActivateCurator:
          return this.previewMessageButton(i as ButtonInteraction, projectId);

        // Кнопка для публикации
        case customId === ProjectPublishId && activation.canActivateCurator:
          break;

        // Кнопка для удаления
        case customId === ProjectDeleteId && activation.canActivateSuper:
          return this.deleteProject(i as ButtonInteraction, projectId);
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
    const embed = new EmbedBuilder()
      .setDefaults(interaction.user)
      .setImage(project.poster);

    const isSuperUser = await this.isSuperUser(interaction);
    const canAssignCurator = isSuperUser && !project.curator;
    const canRemoveCurator = isSuperUser && project.curator;
    const canUnlink =
      isSuperUser &&
      !project.channelId &&
      !project.messageId &&
      !project.branchId;

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
        .setCustomId(ProjectRemoveCuratorId)
        .setLabel("Снять куратора")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canRemoveCurator)
    );

    const messageManageRow =
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ProjectPreviewId)
          .setLabel("Предпросмотр")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(ProjectPublishId)
          .setLabel(
            project.messageId && project.channelId ? "Обновить" : "Опубликовать"
          )
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(ProjectUnlinkId)
          .setLabel("Отвязать")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(canUnlink),
        new ButtonBuilder()
          .setCustomId(ProjectDeleteId)
          .setLabel("Удалить проект")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!isSuperUser)
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
      components: [assignCurator, manageRow, messageManageRow],
    };
  }

  // ============Управление сообщением======

  private async previewMessageButton(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        platforms: true,
        staff: true,
      },
    });

    if (!project) {
      return interaction.reply({
        content: "Указанного проекта больше не существует",
      });
    }

    return interaction.reply({
      embeds: [this.processMessage(interaction, project)],
      ephemeral: true,
    });
  }

  private processMessage(
    interaction: Interaction,
    project: Prisma.ProjectGetPayload<{
      include: { platforms: true; staff: true };
    }>
  ) {
    const platforms = this.processPlatforms(project.platforms);

    const embed = new EmbedBuilder()
      .setDescription(quote(project.title))
      .setImage(project.poster)
      .setTimestamp(Date.now())
      .setFooter({
        text: interaction.client.user.username,
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setFields([
        {
          name: "Рабочий состав",
          value: "Нет",
          inline: true,
        },
        {
          name: "Основные платформы",
          value: platforms.length ? platforms.join("\n") : "Нет",
          inline: true,
        },
      ]);
    return embed;
  }

  private processPlatforms(platforms: Platform[]) {
    return platforms.map((p) => hyperlink(p.name, p.url));
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
      userId!,
      projectId
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

    const [newProject] = await Promise.all([
      prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          curatorId: null,
        },
        include: {
          curator: true,
        },
      }),
      prisma.curator.delete({
        where: {
          projectId: projectId,
        },
      }),
    ]);

    await interaction.editReply(
      await this.createPanelMessage(interaction, newProject)
    );
  }

  //==============Управление проектом============

  private async deleteProject(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("Вы уверены ?")
      .setDescription("Это действие нельзя будет отменить")
      .setDefaults(interaction.user);

    const questionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(ProjectDeleteSubmitId)
        .setEmoji("✅")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(ProjectDeleteCancelId)
        .setEmoji("❌")
        .setStyle(ButtonStyle.Secondary)
    );

    const repl = await interaction.editReply({
      embeds: [embed],
      components: [questionRow],
    });

    const collector = repl.createMessageComponentCollector({
      time: 600_000,
    });

    collector.on("collect", async (inter) => {
      await inter.deferUpdate();
      const customId = inter.customId;

      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

      if (!project) {
        return inter.editReply({
          embeds: [
            embed
              .setTitle("Ошибка")
              .setDescription("Этот проект больше не существует"),
          ],
          components: [],
        });
      }

      if (customId === ProjectDeleteSubmitId) {
        await prisma.project.delete({
          where: {
            id: projectId,
          },
        });

        try {
          inter.editReply({
            embeds: [
              embed
                .setTitle("Проект удалён")
                .setDescription("Вы удалили проект"),
            ],
            components: [],
          });
        } catch {
          return;
        }
      }
      if (customId === ProjectDeleteCancelId) {
        try {
          interaction.editReply({
            embeds: [
              embed
                .setTitle("Проект не был удалён")
                .setDescription("Вы передумали"),
            ],
            components: [],
          });
        } catch {
          return;
        }
      }
      return;
    });
  }

  // =============Управление работниками==========

  // ==============Управление платформами==========

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
        case customId == PlatformManagerAddButtonId &&
          activation.canActivateCurator:
          return this.addPlatformButton(i as ButtonInteraction, projectId);
        case customId == PlatformManagerRemoveId &&
          activation.canActivateCurator:
          return this.deletePlatformSelect(
            i as StringSelectMenuInteraction,
            projectId
          );
        case customId === PlatformManagerUpdateId &&
          activation.canActivateCurator:
          return this.updatePlatformButton(
            i as StringSelectMenuInteraction,
            projectId
          );
        default:
          break;
      }
    });
  }

  private addPlatformButton(interaction: ButtonInteraction, projectId: number) {
    const modal = this.createPlatformModal(PlatformManagerAddModalId);

    const projectIdField =
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(ProjectIdFieldId)
          .setLabel("ID Проекта")
          .setPlaceholder("Верни как было!")
          .setValue(projectId.toString())
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      );

    return interaction.showModal(modal.addComponents(projectIdField));
  }

  async __addPlatformModal(interaction: ModalSubmitInteraction) {
    const [title, url, projectId] = [
      interaction.fields.getTextInputValue(TitleFieldId),
      interaction.fields.getTextInputValue(UrlFieldId),
      interaction.fields.getTextInputValue(ProjectIdFieldId),
    ];

    const numProjectId = Number(projectId);

    if (Number.isNaN(numProjectId)) {
      return interaction.reply({
        content: "ID проекта должен быть числом",
        ephemeral: true,
      });
    }

    const project = await prisma.project.findUnique({
      where: {
        id: numProjectId,
      },
    });

    if (!project) {
      return interaction.reply({
        content: "Указанный вами проект не существует",
        ephemeral: true,
      });
    }

    if (!UrlValidator.isUrl(url)) {
      return interaction.reply({
        content: "Указанная ссылка не является url",
        ephemeral: true,
      });
    }

    const existed = await prisma.platform.findFirst({
      where: {
        name: {
          equals: title.trim(),
          mode: "insensitive",
        },
        projectId: numProjectId,
      },
    });

    const count = await prisma.platform.count({
      where: {
        projectId: numProjectId,
      },
    });

    if (existed) {
      await interaction.deferUpdate();
      await prisma.platform.update({
        where: {
          id: existed.id,
        },
        data: {
          url: url,
        },
      });
      return await interaction.editReply(
        await this.createPlatformManageMessage(interaction, numProjectId)
      );
    }

    if (count + 1 >= PlatformLimit) {
      return interaction.reply({
        content: `Невозможно добавить свыше ${PlatformLimit} платформ (ограничение Discord)`,
        ephemeral: true,
      });
    }
    await prisma.platform.create({
      data: {
        name: title,
        url,
        projectId: numProjectId,
      },
    });
    await interaction.deferUpdate();
    return await interaction.editReply(
      await this.createPlatformManageMessage(interaction, numProjectId)
    );
  }

  private async updatePlatformButton(
    interaction: StringSelectMenuInteraction,
    projectId: number
  ) {
    const platformId = Number(interaction.values[0]);

    const platform = await prisma.platform.findUnique({
      where: {
        id: platformId,
      },
    });

    if (!platform) {
      await interaction.deferUpdate();
      return await interaction.editReply(
        await this.createPlatformManageMessage(interaction, projectId)
      );
    }

    const modal = this.createPlatformModal(
      PlatformManagerUpdateModalId,
      platform
    );

    const platformIdField =
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(PlatformIdFieldId)
          .setLabel("ID Платформы")
          .setPlaceholder("Верни как было!")
          .setValue(platformId.toString())
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      );

    const projectIdField =
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(ProjectIdFieldId)
          .setLabel("ID Проекта")
          .setPlaceholder("Верни как было!")
          .setValue(projectId.toString())
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
      );

    return interaction.showModal(
      modal.addComponents(platformIdField, projectIdField)
    );
  }

  async __updatePlatformModal(interaction: ModalSubmitInteraction) {
    const [title, url, platformId, projectId] = [
      interaction.fields.getTextInputValue(TitleFieldId),
      interaction.fields.getTextInputValue(UrlFieldId),
      interaction.fields.getTextInputValue(PlatformIdFieldId),
      interaction.fields.getTextInputValue(ProjectIdFieldId),
    ];

    const numPlatformId = Number(platformId);
    const numProjectId = Number(projectId);

    if (Number.isNaN(numPlatformId) || Number.isNaN(numProjectId)) {
      return interaction.reply({
        content: "Указанный id платформы или id проекта не является числом",
        ephemeral: true,
      });
    }

    const [project, platform] = await Promise.all([
      prisma.project.findUnique({
        where: {
          id: numProjectId,
        },
      }),
      prisma.platform.findUnique({
        where: {
          id: numPlatformId,
        },
      }),
    ]);

    if (!project) {
      return interaction.reply({
        content: "Указанного вами проекта не существует",
        ephemeral: true,
      });
    }

    if (!platform) {
      return interaction.reply({
        content: "Указанной вами платформы не существует",
        ephemeral: true,
      });
    }

    if (title != platform.name) {
      const newExistedTitle = await prisma.platform.findFirst({
        where: {
          name: {
            equals: title,
            mode: "insensitive",
          },
        },
      });

      if (newExistedTitle) {
        return interaction.reply({
          content: "Платформа с указанным названием уже существует",
          ephemeral: true,
        });
      }
    }

    await prisma.platform.update({
      where: {
        id: platform.id,
      },
      data: {
        url,
        name: title,
      },
    });

    await interaction.deferUpdate();
    return await interaction.editReply(
      await this.createPlatformManageMessage(interaction, numProjectId)
    );
  }

  private async deletePlatformSelect(
    interaction: StringSelectMenuInteraction,
    projectId: number
  ) {
    await interaction.deferUpdate();
    const platformId = Number(interaction.values[0]);

    const existed = await prisma.platform.findUnique({
      where: {
        id: platformId,
      },
    });

    if (existed) {
      await prisma.platform.delete({
        where: {
          id: platformId,
        },
      });
    }

    await interaction.editReply(
      await this.createPlatformManageMessage(interaction, projectId)
    );
  }

  private async createPlatformManageMessage(
    interaction: Interaction,
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

    const platforms =
      project?.platforms
        .slice(0, PlatformLimit)
        .map((platform) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(platform.name)
            .setValue(platform.id.toString())
        ) ?? [];
    const embed = new EmbedBuilder()
      .setTitle("Управление платформами проекта")
      .setDescription(
        "С помощью кнопок ниже вы сможете управлять привязанными к проекту платформами"
      )
      .setFields({
        name: "Количество платформ",
        value: platforms.length.toString(),
      })
      .setDefaults(interaction.user);

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
          .setCustomId(PlatformManagerRemoveId)
          .setPlaceholder("Платформа для удаления")
          .setOptions(platforms)
      );

    const addPlatform = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PlatformManagerAddButtonId)
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

  private createPlatformModal(customId: string, platform?: Platform) {
    const modal = new ModalBuilder()
      .setCustomId(customId)
      .setTitle("Добавить платформу");

    const titleField = new TextInputBuilder()
      .setCustomId(TitleFieldId)
      .setLabel("Название платформы")
      .setPlaceholder("MangaLib")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(255)
      .setStyle(TextInputStyle.Short);

    const urlField = new TextInputBuilder()
      .setCustomId(UrlFieldId)
      .setPlaceholder("https://mangalib.me/")
      .setLabel("Ссылка на платформу")
      .setRequired(true)
      .setStyle(TextInputStyle.Short);

    if (platform?.name) {
      titleField.setValue(platform.name);
    }

    if (platform?.url) {
      urlField.setValue(platform.url);
    }

    const [titleRow, urlRow] = [
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleField),
      new ActionRowBuilder<TextInputBuilder>().addComponents(urlField),
    ];

    return modal.addComponents(titleRow, urlRow);
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
}
