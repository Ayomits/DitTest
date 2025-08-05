import { logger } from "#logger/index.js";

export class UrlValidator {
  static isUrl(url: string): boolean {
    return /^https?:\/\/([A-Za-zа-яЁёА-Я]+).([A-Za-zА-Яа-яёЁ]+)/.test(url);
  }

  static async isImageUrl(url: string): Promise<boolean> {
    if (!this.isUrl(url)) {
      return false;
    }

    try {
      const res = await fetch(url);
      return res.ok;
    } catch (err) {
      logger.error(err);
      return false;
    }
  }
}
