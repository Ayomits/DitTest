import { Discord, Guard, Slash } from "discordx";
import { singleton } from "tsyringe";

import { IsCurator } from "#guards/is-curator.guard.js";

@Discord()
@Guard(IsCurator)
@singleton()
export class ProjectController {
  @Slash({ name: "create-project", description: "Создать проект" })
  async createProject() {}
}
