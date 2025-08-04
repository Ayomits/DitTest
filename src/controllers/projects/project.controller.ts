import {
  ApplicationCommandOptionType,
  type CommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { Discord, Guard, ModalComponent, Slash, SlashOption } from "discordx";
import { inject, singleton } from "tsyringe";

import { IsSuperUser } from "#guards/is-curator.guard.js";

import { CreateProjectModalId } from "./project.const.js";
import { ProjectService } from "./project.service.js";

@Discord()
@singleton()
export class ProjectController {
  constructor(@inject(ProjectService) private projectService: ProjectService) {}

  @Slash({ name: "create-project", description: "Создать проект" })
  @Guard(IsSuperUser)
  async createProjectSlash(interaction: CommandInteraction) {
    return this.projectService.createProjectSlash(interaction);
  }

  @ModalComponent({ id: CreateProjectModalId })
  async createProjectModal(interaction: ModalSubmitInteraction) {
    return this.projectService.createProjectModal(interaction);
  }

  @Slash({ name: "update-project", description: "Создать проект" })
  async updateProject(
    @SlashOption({
      name: "search",
      description: "Проект для обновления",
      type: ApplicationCommandOptionType.String,
      required: true,
    })
    projectId: string,
    interaction: CommandInteraction
  ) {
    return this.projectService.updateProjectSlash(interaction, projectId);
  }
}
