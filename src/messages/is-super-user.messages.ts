import { roleMention, type Snowflake } from "discord.js";

export const IsSuperUserGuardMessages = {
  role: {
    title: "Роль не настроена",
    description: "Роль супер пользователя не настроена",
  },
  forbidden: {
    title: "Недостаточно прав",
    description: (roleId: Snowflake) =>
      `У вас нет роли супер пользователя: ${roleMention(roleId)}`,
  },
} as const;
