import { codeBlock, roleMention, type Snowflake } from "discord.js";

export const AdminAssignRolesMessages = {
  embed: {
    title: "Назначение роли супер пользователя",
    description:
      "С помощью селект меню ниже, назначьте роль супер пользователя, позволяющая создавать тайтлы",
    fields: (roleId?: Snowflake) => [
      {
        name: "Нынешняя роль",
        value: roleId ? roleMention(roleId) : codeBlock("Нет"),
      },
    ],
  },
  assingSelect: {
    placeholder: "Выберите роль супер пользователя",
    messages: {
      success: {
        title: "Назначение роли супер пользователя",
        description: (id: Snowflake) =>
          `Успешно установлена роль супер пользователя ${roleMention(id)}`,
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
        description: "Роль супер пользователя была успешно удалена",
      },
      notExisted: {
        title: "Роли не существует",
        description: "Невозможно удалить роль супер пользователя из настроек",
      },
      error: {
        title: "Ошибка",
        description: "Что-то пошло не так...",
      },
    },
  },
} as const;
