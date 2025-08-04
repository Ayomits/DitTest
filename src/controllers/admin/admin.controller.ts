import {
  type ButtonInteraction,
  type CommandInteraction,
  type RoleSelectMenuInteraction,
} from "discord.js";
import { ButtonComponent, Discord, SelectMenuComponent, Slash } from "discordx";
import { inject, singleton } from "tsyringe";

import {
  AdminAssingCuratorRoleSelectId,
  AdminRemoveCuratorRoleButtonId,
} from "./admin.const.js";
import { AdminService } from "./admin.service.js";

@Discord()
@singleton()
export class AdminController {
  constructor(@inject(AdminService) private adminService: AdminService) {}

  @Slash({
    name: "super-role",
    description: "Назначить супер роль",
    defaultMemberPermissions: ["Administrator"],
  })
  async assingRolesSlash(interaction: CommandInteraction) {
    return this.adminService.assingRolesSlash(interaction);
  }

  @SelectMenuComponent({ id: AdminAssingCuratorRoleSelectId })
  async assignCuratorRoleSelect(interaction: RoleSelectMenuInteraction) {
    return this.adminService.assignCuratorRoleSelect(interaction);
  }

  @ButtonComponent({ id: AdminRemoveCuratorRoleButtonId })
  async deleteCuratorRoleButton(interaction: ButtonInteraction) {
    return this.adminService.deleteCuratorRoleButton(interaction);
  }
}
