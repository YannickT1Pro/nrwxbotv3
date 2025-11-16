import { KodariBot } from '../bot';
import { logger } from '../utils/logger';

export default {
  name: 'ready',
  once: true,
  async execute(bot: KodariBot) {
    logger.info(`Bot ready as ${bot.user?.tag}`);

    const guildIds = bot.guilds.cache.map(g => g.id);
    await bot.configManager.prewarmCache(guildIds);

    logger.info(`Loaded ${bot.commands.size} commands`);
    logger.info(`Connected to ${bot.guilds.cache.size} guilds`);
  },
};