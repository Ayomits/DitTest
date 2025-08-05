import type { ModalSubmitInteraction } from "discord.js";
import { Discord, ModalComponent } from "discordx";
import { inject, singleton } from "tsyringe";

import {
  PlatformManagerAddModalId,
  PlatformManagerUpdateModalId,
} from "./panel.const.js";
import { ProjectPanel } from "./panel.service.js";

@Discord()
@singleton()
export class PanelController {
  constructor(@inject(ProjectPanel) private projectPanel: ProjectPanel) {}

  @ModalComponent({ id: PlatformManagerAddModalId })
  async platformManagerAddModal(interaction: ModalSubmitInteraction) {
    return this.projectPanel.handlePlatformCreation(interaction);
  }

  @ModalComponent({ id: PlatformManagerUpdateModalId })
  async platformManagerUpdateModal(interaction: ModalSubmitInteraction) {
    return this.projectPanel.processPlatformUpdate(interaction);
  }
}
