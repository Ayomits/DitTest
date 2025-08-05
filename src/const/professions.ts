import type { LiteralEnum } from "#shared/types/literal-enum.js";

export const Professions = {
  Translator: "TRANSLATOR",
  Editor: "EDITOR",
  Cleaner: "CLEANER",
  Typer: "TYPER",
  BetaReader: "BETA_READER",
} as const;

export type Profession = LiteralEnum<typeof Professions>;

export function getRussianTranslation(profession: Profession) {
  switch (profession) {
    case "BETA_READER":
      return "Бета ридер";
    case "CLEANER":
      return "Клинер";
    case "EDITOR":
      return "Редактор";
    case "TRANSLATOR":
      return "Переводчик";
    case "TYPER":
      return "Тайпер";
    default:
      return "Неизвестно";
  }
}

export function getRussianTranslations() {
  return Object.values(Professions).map((value) => ({
    key: value,
    value: getRussianTranslation(value),
  }));
}
