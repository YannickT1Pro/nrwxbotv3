import { KodariBot } from '../bot';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export class EventManager {
  private bot: KodariBot;

  constructor(bot: KodariBot) {
    this.bot = bot;
  }

  async loadEvents(): Promise<void> {
    const eventsPath = join(__dirname, '../events');
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const event = require(filePath).default;

      if (event.once) {
        this.bot.once(event.name, (...args) => event.execute(...args, this.bot));
      } else {
        this.bot.on(event.name, (...args) => event.execute(...args, this.bot));
      }

      logger.info(`Loaded event: ${event.name}`);
    }
  }
}