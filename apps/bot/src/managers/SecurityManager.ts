import { KodariBot } from '../bot';
import { GuildMember, Message, TextChannel } from 'discord.js';
import { prisma } from '@kodari/database';
import { RedisKeys, buildRedisKey } from '@kodari/shared';
import { logger } from '../utils/logger';

export class SecurityManager {
  private bot: KodariBot;
  private raidTracker: Map<string, number[]>;

  constructor(bot: KodariBot) {
    this.bot = bot;
    this.raidTracker = new Map();
  }

  async checkSpam(message: Message): Promise<boolean> {
    if (!message.guild) return false;

    const config = await this.bot.configManager.getConfig(message.guild.id);
    if (!config.antiSpamEnabled) return false;

    const key = buildRedisKey(RedisKeys.SPAM_RECORD, message.guild.id, message.author.id);
    const count = await this.bot.redis.incr(key, config.antiSpamTimeWindow);

    if (count > config.antiSpamThreshold) {
      await message.delete().catch(() => {});
      
      if (count === config.antiSpamThreshold + 1) {
        const member = message.member;
        if (member) {
          await member.timeout(60000, 'Anti-spam triggered').catch(() => {});
          
          const channel = message.channel as TextChannel;
          await channel.send(`<@${message.author.id}> wurde wegen Spam stummgeschaltet.`);
        }
      }

      logger.warn(`Spam detected from ${message.author.tag} in ${message.guild.name}`);
      return true;
    }

    return false;
  }

  async checkRaid(member: GuildMember): Promise<boolean> {
    const config = await this.bot.configManager.getConfig(member.guild.id);
    if (!config.antiRaidEnabled) return false;

    const guildId = member.guild.id;
    const now = Date.now();

    if (!this.raidTracker.has(guildId)) {
      this.raidTracker.set(guildId, []);
    }

    const joins = this.raidTracker.get(guildId)!;
    joins.push(now);

    const cutoff = now - (config.antiRaidTimeWindow * 1000);
    const recentJoins = joins.filter(time => time > cutoff);
    this.raidTracker.set(guildId, recentJoins);

    if (recentJoins.length >= config.antiRaidJoinThreshold) {
      logger.warn(`Raid detected in ${member.guild.name}: ${recentJoins.length} joins in ${config.antiRaidTimeWindow}s`);
      
      await member.kick('Anti-raid protection').catch(() => {});
      
      return true;
    }

    return false;
  }

  async checkLinkFilter(message: Message): Promise<boolean> {
    if (!message.guild) return false;

    const config = await this.bot.configManager.getConfig(message.guild.id);
    if (!config.linkFilterEnabled) return false;

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const urls = message.content.match(urlRegex);

    if (!urls) return false;

    for (const url of urls) {
      const domain = new URL(url).hostname;

      if (config.linkBlacklist.some(blocked => domain.includes(blocked))) {
        await message.delete().catch(() => {});
        await message.channel.send(`<@${message.author.id}> Links von dieser Domain sind nicht erlaubt.`);
        logger.warn(`Blocked blacklisted link from ${message.author.tag}: ${url}`);
        return true;
      }

      if (config.linkWhitelist.length > 0 && !config.linkWhitelist.some(allowed => domain.includes(allowed))) {
        await message.delete().catch(() => {});
        await message.channel.send(`<@${message.author.id}> Nur Links von erlaubten Domains sind zugelassen.`);
        logger.warn(`Blocked non-whitelisted link from ${message.author.tag}: ${url}`);
        return true;
      }
    }

    return false;
  }

  async checkVerification(member: GuildMember): Promise<boolean> {
    const config = await this.bot.configManager.getConfig(member.guild.id);
    if (!config.verificationEnabled) return true;

    const accountAge = Date.now() - member.user.createdTimestamp;
    const minAge = config.minAccountAge * 24 * 60 * 60 * 1000;

    if (accountAge < minAge) {
      logger.info(`Suspicious account detected: ${member.user.tag} (age: ${Math.floor(accountAge / (24 * 60 * 60 * 1000))} days)`);
      return false;
    }

    return true;
  }
}