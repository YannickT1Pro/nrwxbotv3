import { GuildConfig, RedisKeys, buildRedisKey } from '@kodari/shared';
import { prisma } from '@kodari/database';
import { KodariBot } from '../bot';
import { logger } from '../utils/logger';

export class ConfigManager {
  private bot: KodariBot;
  private configCache: Map<string, GuildConfig>;

  constructor(bot: KodariBot) {
    this.bot = bot;
    this.configCache = new Map();
  }

  async initialize(): Promise<void> {
    await this.bot.redis.subscribe('config:update', async (payload) => {
      const { guildId, config } = payload;
      await this.updateConfig(guildId, config);
    });

    logger.info('ConfigManager initialized with Redis pub/sub');
  }

  async getConfig(guildId: string): Promise<GuildConfig> {
    if (this.configCache.has(guildId)) {
      return this.configCache.get(guildId)!;
    }

    const redisKey = buildRedisKey(RedisKeys.GUILD_CONFIG, guildId);
    const cached = await this.bot.redis.get<GuildConfig>(redisKey);
    
    if (cached) {
      this.configCache.set(guildId, cached);
      return cached;
    }

    let guild = await prisma.guild.findUnique({ where: { id: guildId } });

    if (!guild) {
      guild = await prisma.guild.create({
        data: { id: guildId, name: 'Unknown' },
      });
    }

    const config: GuildConfig = {
      id: guild.id,
      prefix: guild.prefix,
      welcomeChannelId: guild.welcomeChannelId || undefined,
      welcomeMessage: guild.welcomeMessage || undefined,
      welcomeRoleId: guild.welcomeRoleId || undefined,
      welcomeDmEnabled: guild.welcomeDmEnabled,
      logChannelId: guild.logChannelId || undefined,
      modLogChannelId: guild.modLogChannelId || undefined,
      ticketLogChannelId: guild.ticketLogChannelId || undefined,
      antiSpamEnabled: guild.antiSpamEnabled,
      antiSpamThreshold: guild.antiSpamThreshold,
      antiSpamTimeWindow: guild.antiSpamTimeWindow,
      antiRaidEnabled: guild.antiRaidEnabled,
      antiRaidJoinThreshold: guild.antiRaidJoinThreshold,
      antiRaidTimeWindow: guild.antiRaidTimeWindow,
      antiNukeEnabled: guild.antiNukeEnabled,
      linkFilterEnabled: guild.linkFilterEnabled,
      linkWhitelist: guild.linkWhitelist,
      linkBlacklist: guild.linkBlacklist,
      musicMaxQueueLength: guild.musicMaxQueueLength,
      musicAutoLeaveTimeout: guild.musicAutoLeaveTimeout,
      verificationEnabled: guild.verificationEnabled,
      verificationRoleId: guild.verificationRoleId || undefined,
      verificationChannelId: guild.verificationChannelId || undefined,
      minAccountAge: guild.minAccountAge,
    };

    await this.bot.redis.set(redisKey, config, 3600);
    this.configCache.set(guildId, config);

    return config;
  }

  async updateConfig(guildId: string, updates: Partial<GuildConfig>): Promise<void> {
    await prisma.guild.update({
      where: { id: guildId },
      data: updates as any,
    });

    const redisKey = buildRedisKey(RedisKeys.GUILD_CONFIG, guildId);
    await this.bot.redis.del(redisKey);
    this.configCache.delete(guildId);

    logger.info(`Config updated for guild ${guildId}`);
  }

  async prewarmCache(guildIds: string[]): Promise<void> {
    logger.info(`Prewarming config cache for ${guildIds.length} guilds`);
    await Promise.all(guildIds.map(id => this.getConfig(id)));
  }
}