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
import { ProjectRepository } from "#repositories/project.repository.js";
import { SuperRolesRepository } from "#repositories/super-roles.repository.js";
import { EmbedBuilder } from "#shared/embeds/embed.builder.js";
import { UsersUtility } from "#shared/embeds/user.utility.js";

import {
  CreateProjectModalId,
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
    @inject(ProjectRepository) private projectRepository: ProjectRepository,
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
    const existed = await this.projectRepository.findByTitle(
      interaction.guild!.id,
      title
    );

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

    const project = await this.projectRepository.createProject(
      interaction.guild!.id,
      title,
      poster
    );

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

    const project = await this.projectRepository.findById(numProjectId);

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
      const isSuperUser = await this.isSuperUser(i);
      const isProjectCurator = await this.isProjectCurator(i, project.id);
      const canActivate = isSuperUser || isProjectCurator;

      switch (true) {
        case customId === ProjectAssignCuratorId && isSuperUser:
          return this.assignCurator(i as UserSelectMenuInteraction, project.id);
        case customId === ProjectRemoveCuratorId && isSuperUser:
          return this.removeCurator(i as ButtonInteraction, project.id);
        case customId === ProjectPreviewId && canActivate:
          break;
        case customId === ProjectPublishId && canActivate:
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

    const newProject = await this.projectRepository.assignCurator(
      projectId,
      curator.id
    );

    return await interaction.editReply(
      await this.createPanelMessage(interaction, newProject)
    );
  }

  private async removeCurator(
    interaction: ButtonInteraction,
    projectId: number
  ) {
    await interaction.deferUpdate();

    const newProject = await this.projectRepository.unlinkCurator(projectId);

    await interaction.editReply(
      await this.createPanelMessage(interaction, newProject)
    );
  }

  // ==============Управление платформами==========
  // private async platformManage() {}

  // private async addPlatform() {}

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

  private async isProjectCurator(interaction: Interaction, projectId: number) {
    const project = await this.projectRepository.findById(projectId);

    return project?.curator?.userId === interaction.user.id;
  }

  // private processEmployee() {}
  // private processPlatforms() {}
  // private async assignChannel() {}
  // private async unlink() {}
}
