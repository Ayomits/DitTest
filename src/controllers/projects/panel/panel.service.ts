import type {
  Curator,
  Employee,
  Platform,
  Prisma,
  Project,
} from "@prisma/client";
import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  type ChannelSelectMenuInteraction,
  ChannelType,
  codeBlock,
  type CommandInteraction,
  type GuildMember,
  hyperlink,
  inlineCode,
  type Interaction,
  type InteractionEditReplyOptions,
  ModalBuilder,
  type ModalSubmitInteraction,
  quote,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  type TextChannel,
  TextInputBuilder,
  TextInputStyle,
  userMention,
  UserSelectMenuBuilder,
  type UserSelectMenuInteraction,
} from "discord.js";
import { inject, injectable } from "tsyringe";

import {
  getRussianTranslation,
  getRussianTranslations,
  type Profession,
} from "#const/professions.js";
import { CuratorRepository } from "#repositories/curator.repository.js";
import { SuperRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { prisma } from "#shared/prisma/client.js";
import { UrlValidator } from "#shared/validators/url.js";

import {
  EmployeeAssignId,
  EmployeeAssignProfessionId,
  EmployeeAssignUsrId,
  EmployeeDeleteId,
  EmployeeDeleteProfessionId,
  EmployeeLimit,
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
  ProjectPublishChannelSelectId,
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

        case customId === ProjectManageEmployeeId &&
          activation.canActivateCurator:
          return this.manageEmployee(i as ButtonInteraction, projectId);

        // Кнопка для превью
        case customId === ProjectPreviewId && activation.canActivateCurator:
          return this.previewMessageButton(i as ButtonInteraction, projectId);

        // Кнопка для публикации
        case customId === ProjectPublishId && activation.canActivateCurator:
          return this.publishMessageButton(i as ButtonInteraction, projectId);

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
    await interaction.deferReply({ ephemeral: true });
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        platforms: true,
        staff: true,
        curator: true,
      },
    });

    if (!project) {
      return interaction.editReply({
        content: "Указанного проекта больше не существует",
      });
    }

    return interaction.editReply({
      embeds: [this.processMessage(interaction, project)],
    });
  }

  private async publishMessageButton(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        staff: true,
        platforms: true,
        curator: true,
      },
    });

    if (!project) {
      return interaction.editReply({
        content: "Указанный проект не существует",
      });
    }

    if (project.messageId && project.channelId && project.branchId) {
      const channel = (await interaction.guild?.channels.fetch(
        project.channelId
      )) as TextChannel;

      if (!channel) {
        interaction.editReply({
          content: "Канал, к которому привязан проект, был не найден",
        });
        return await this.resetProjectMessage(projectId);
      }

      const message = await channel.messages.fetch(project.messageId);

      if (!message) {
        interaction.editReply({
          content: "Сообщение, к которому привязан проект, было не найдено",
        });
        return await this.resetProjectMessage(projectId);
      }

      let branch = await channel.threads.fetch(project.branchId!);

      if (!branch) {
        branch = await message.startThread({
          name: "Материалы тайтла",
        });
      }

      let newProject = project;

      if (project.branchId !== branch.id) {
        newProject = await prisma.project.update({
          where: {
            id: projectId,
          },
          data: {
            branchId: branch.id,
          },
          include: {
            staff: true,
            curator: true,
            platforms: true,
          },
        });
      }
      const embed = this.processMessage(interaction, newProject);
      message.edit({ embeds: [embed] });

      interaction.editReply({
        content: "Сообщени успешно обновлено",
      });
    } else {
      const projectEmbed = this.processMessage(interaction, project);

      const channelSelect =
        new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
          new ChannelSelectMenuBuilder()
            .setCustomId(ProjectPublishChannelSelectId)
            .setChannelTypes(ChannelType.GuildText)
            .setPlaceholder("Выберите канал публикации")
        );

      const repl = await interaction.editReply({
        embeds: [projectEmbed],
        components: [channelSelect],
      });

      const collector = repl.createMessageComponentCollector({
        time: 600_000,
        filter: (i) => i.message.id === repl.id,
      });

      collector.on("collect", async (i) => {
        const customId = i.customId;

        if (customId === ProjectPublishChannelSelectId) {
          const inter = i as ChannelSelectMenuInteraction;
          const channelId = inter.values[0];

          const channel = inter.guild?.channels.cache.get(
            channelId!
          ) as TextChannel;

          try {
            const message = await channel.send({
              embeds: [projectEmbed],
            });
            const branch = await message.startThread({
              name: "Материалы тайтла",
            });

            const newProject = await prisma.project.update({
              where: {
                id: projectId,
              },
              data: {
                messageId: message.id,
                branchId: branch.id,
                channelId,
              },
              include: {
                staff: true,
                curator: true,
                platforms: true,
              },
            });
            const embed = this.processMessage(inter, newProject);
            await message.edit({
              embeds: [embed],
            });
          } catch {
            return;
          }
        }
      });
    }
  }

  private async resetProjectMessage(projectId: number) {
    await prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        messageId: null,
        channelId: null,
        branchId: null,
      },
    });
  }

  private processMessage(
    interaction: Interaction,
    project: Prisma.ProjectGetPayload<{
      include: { platforms: true; staff: true; curator: true };
    }>
  ) {
    const platforms = this.processPlatforms(project.platforms);
    const staff = this.processStaff(project.staff, project.curator);

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
          value: staff.length ? staff.join("\n") : "Нет",
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

  private processStaff(
    staff: Employee[],
    curator?: Curator | undefined | null
  ) {
    return [
      staff.map(
        (e) =>
          `${inlineCode(getRussianTranslation(e.profession as Profession))}:${userMention(e.userId)}`
      ),
      curator
        ? `${inlineCode("Куратор")}:${userMention(curator.userId)}`
        : null,
    ].filter(Boolean);
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
      filter: (i) => i.message.id === repl.id,
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

  private async manageEmployee(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        staff: true,
      },
    });

    if (!project) {
      return interaction.editReply({
        content: "Указанный проект не существует",
      });
    }

    const embed = new EmbedBuilder()
      .setDefaults(interaction.user)
      .setTitle("Управление работниками")
      .setDescription("С помощью кнопок ниже вы сможете управлять работниками");

    const canDelete = project.staff.length <= 0;
    const canAssign = project.staff.length >= EmployeeLimit;

    const employeeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EmployeeAssignId)
        .setLabel("Назначить")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(canAssign),
      new ButtonBuilder()
        .setCustomId(EmployeeDeleteId)
        .setLabel("Снять")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(canDelete)
    );

    const repl = await interaction.editReply({
      embeds: [embed],
      components: [employeeRow],
    });

    const collector = repl.createMessageComponentCollector({
      time: 600_000,
      filter: (i) => i.message.id === repl.id,
    });

    collector.on("collect", async (i) => {
      const customId = i.customId;
      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          staff: true,
        },
      });

      if (!project) {
        return i.reply({
          content: "Указанный проект не существует",
          ephemeral: true,
        });
      }

      if (customId === EmployeeAssignId) {
        return this.assignEmployee(i as ButtonInteraction, projectId);
      }
      if (customId === EmployeeDeleteId) {
        return this.deleteEmployee(i as ButtonInteraction, projectId);
      }
    });
  }

  private async assignEmployee(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        staff: true,
      },
    });

    if (!project) {
      return interaction.editReply({
        content: "Указанный проект не существует",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Назначить работника")
      .setDefaults(interaction.user)
      .setDescription("С помощью селекта ниже выберите должность");

    const professionSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(EmployeeAssignProfessionId)
          .setPlaceholder("Выберите профессию")
          .setOptions(
            getRussianTranslations().map((i) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(i.value!)
                .setValue(i.key!)
            )
          )
      );

    const userSelect =
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
        new UserSelectMenuBuilder()
          .setCustomId(EmployeeAssignUsrId)
          .setPlaceholder("Выберите пользователя")
      );

    const repl = await interaction.editReply({
      embeds: [embed],
      components: [professionSelect],
    });

    const collector = repl.createMessageComponentCollector({
      time: 600_000,
      filter: (i) => i.user.id === repl.id,
    });

    let profession: Profession | null = null;
    collector.on("collect", async (i) => {
      const customId = i.customId;

      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
      });

      if (!project) {
        return i.reply({
          content: "Указанный проект не существует",
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      if (customId === EmployeeAssignProfessionId) {
        const inter = i as StringSelectMenuInteraction;
        const value = inter.values[0] as Profession;
        profession = value;

        return inter.editReply({
          embeds: [
            embed
              .setTitle("Выберите пользователя")
              .setDescription("Кого вы хотите назначить ?"),
          ],
          components: [userSelect],
        });
      }
      if (customId === EmployeeAssignUsrId) {
        const inter = i as UserSelectMenuInteraction;
        const userId = inter.values[0];

        const member = await inter.guild?.members.fetch(userId!);

        if (member?.user.bot) {
          return inter.editReply({
            embeds: [
              embed
                .setTitle("Ошибка")
                .setDescription("Выберите другого пользователя"),
            ],
          });
        }

        const employee = await prisma.employee.findFirst({
          where: {
            projectId: projectId,
            userId: userId,
            profession: profession!,
          },
        });

        if (employee) {
          await prisma.employee.update({
            where: {
              id: employee.id,
            },
            data: {
              profession: profession!,
            },
          });
        } else {
          await prisma.employee.create({
            data: {
              userId: userId!,
              profession: profession!,
              projectId: projectId,
            },
          });
        }

        return inter.editReply({
          embeds: [
            embed
              .setTitle("Работник назначен")
              .setDescription("Вы успешно назначили работника"),
          ],
          components: [],
        });
      }
      return;
    });
  }

  private async deleteEmployee(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      include: {
        staff: true,
      },
    });

    if (!project) {
      return interaction.editReply({
        content: "Указанный проект не существует",
      });
    }

    if (project.staff.length <= 0) {
      return interaction.editReply({
        content: "У проекта нет сотрудников",
      });
    }

    const embed = new EmbedBuilder()
      .setDefaults(interaction.user)
      .setTitle("Снять работника")
      .setDescription(
        "В селект меню представлены должности, где есть сотрудники"
      );

    const professionSelect =
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(EmployeeDeleteProfessionId)
          .setPlaceholder("Снять с должности")
          .setOptions(
            project.staff.map((e) =>
              new StringSelectMenuOptionBuilder()
                .setValue(e.profession)
                .setLabel(getRussianTranslation(e.profession as Profession))
            )
          )
      );

    const repl = await interaction.editReply({
      embeds: [embed],
      components: [professionSelect],
    });

    const collector = repl.createMessageComponentCollector({
      time: 600_000,
      filter: (i) => i.message.id === repl.id,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      const customId = i.customId;
      const project = await prisma.project.findUnique({
        where: {
          id: projectId,
        },
        include: {
          staff: true,
        },
      });

      if (!project) {
        return i.editReply({
          content: "Указанный проект не существует",
        });
      }

      if (project.staff.length <= 0) {
        return i.editReply({
          content: "У проекта нет сотрудников",
        });
      }

      if (customId === EmployeeDeleteProfessionId) {
        const inter = i as StringSelectMenuInteraction;
        const profession = inter.values[0] as Profession;

        await prisma.employee.deleteMany({
          where: {
            projectId: projectId,
            profession: profession,
          },
        });

        return inter.editReply({
          embeds: [
            embed
              .setTitle("Сотрудник снят")
              .setDescription("Сотрудник успешно снят с должности"),
          ],
          components: [],
        });
      }
    });
  }

  // ==============Управление платформами==========

  private async platformManageButton(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferReply({ ephemeral: true });
    const repl = await interaction.editReply(
      await this.createPlatformManageMessage(interaction, projectId)
    );

    const collector = repl.createMessageComponentCollector({
      time: 600_000,
      filter: (i) => i.message.id === repl.id,
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
