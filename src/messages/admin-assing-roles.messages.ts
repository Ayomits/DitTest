import { codeBlock, roleMention, type Snowflake } from "discord.js";

export const AdminAssignRolesMessages = {
  embed: {
    title: "Назначение ролей кураторов",
    description:
      "С помощью селект меню ниже, назначьте роли кураторов, позволяющие создавать тайтлы",
    fields: (roleId?: Snowflake) => [
      {
        name: "Нынешняя роль",
        value: roleId ? roleMention(roleId) : codeBlock("Нет"),
      },
    ],
  },
  assingSelect: {
    placeholder: "Выберите роль куратора",
    messages: {
      success: {
        title: "Назначение роли куратора",
        description: (id: Snowflake) =>
          `Успешно установлена роль куратора ${roleMention(id)}`,
      },
      error: {
        title: "Ошибка",
        description: "Что-то пошло не так...",
      },
    },
  },
  removeButton: {
    label: "Удалить роль",
    messages: {
      success: {
        title: `Удаление роли`,
        description: "Роль куратора была успешно удалена",
      },
      notExisted: {
        title: "Роли не существует",
        description: "Невозможно удалить роль куратора из настроек",
      },
      error: {
        title: "Ошибка",
        description: "Что-то пошло не так...",
      },
    },
  },
} as const;
