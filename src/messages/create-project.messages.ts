import {
  chatInputApplicationCommandMention,
  codeBlock,
  type Interaction,
} from "discord.js";

export const CreateProjectMessages = {
  embed: {
    validation: {
      url: {
        title: "Ссылка на обложку невалидна",
        fields: (title: string, poster: string) => [
          {
            name: "Название проекта",
            value: codeBlock(title),
            inline: true,
          },
          {
            name: "Обложка",
            value: codeBlock(poster),
            inline: true,
          },
        ],
      },
      existed: {
        title: "Проект уже существует",
        description: (interaction: Interaction) => {
          const command =
            interaction.client.application.commands.cache.get("update-project");
          return `Проект с таким названием уже существует. Воспользуйтесь командой ${chatInputApplicationCommandMention(command!.name, command!.id)}`;
        },
        fields: (title: string, poster: string) => [
          {
            name: "Название проекта",
            value: codeBlock(title),
            inline: true,
          },
          {
            name: "Обложка",
            value: codeBlock(poster),
            inline: true,
          },
        ],
      },
    },
  },
  modal: {
    title: "Создать проект",
  },
};
