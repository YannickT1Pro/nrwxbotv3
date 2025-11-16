import { KodariBot } from '../bot';
import { Message } from 'discord.js';
import { prisma } from '@kodari/database';
import { RedisKeys, buildRedisKey } from '@kodari/shared';
import { logger } from '../utils/logger';

export class AISupportManager {
  private bot: KodariBot;
  private triggersCache: Map<string, any[]>;

  constructor(bot: KodariBot) {
    this.bot = bot;
    this.triggersCache = new Map();
  }

  async loadTriggers(guildId: string): Promise<void> {
    const redisKey = buildRedisKey(RedisKeys.AI_TRIGGERS, guildId);
    const cached = await this.bot.redis.get<any[]>(redisKey);

    if (cached) {
      this.triggersCache.set(guildId, cached);
      return;
    }

    const triggers = await prisma.aISupportTrigger.findMany({
      where: { guildId, enabled: true },
      orderBy: { priority: 'desc' },
    });

    await this.bot.redis.set(redisKey, triggers, 300);
    this.triggersCache.set(guildId, triggers);
  }

  async processMessage(message: Message): Promise<boolean> {
    if (!message.guild) return false;

    await this.loadTriggers(message.guild.id);
    const triggers = this.triggersCache.get(message.guild.id) || [];

    const content = message.content.toLowerCase();

    for (const trigger of triggers) {
      let matched = false;

      if (trigger.isRegex) {
        try {
          const regex = new RegExp(trigger.trigger, 'i');
          matched = regex.test(message.content);
        } catch (error) {
          logger.error(`Invalid regex in trigger ${trigger.id}:`, error);
          continue;
        }
      } else {
        const keywords = trigger.trigger.toLowerCase().split('|');
        matched = keywords.some(keyword => content.includes(keyword.trim()));
      }

      if (matched) {
        await message.reply(trigger.response);

        await prisma.aISupportTrigger.update({
          where: { id: trigger.id },
          data: { useCount: { increment: 1 } },
        });

        logger.info(`AI Support triggered for ${message.author.tag}: ${trigger.trigger}`);
        return true;
      }
    }

    const config = await this.bot.configManager.getConfig(message.guild.id);
    
    await prisma.unmatchedQuestion.create({
      data: {
        guildId: message.guild.id,
        userId: message.author.id,
        question: message.content,
      },
    });

    const fallbackMessage = 'Ich habe dazu leider keine Information. Bitte erstelle ein Ticket für weitere Hilfe.';
    await message.reply(fallbackMessage);

    logger.info(`Unmatched AI Support question from ${message.author.tag}: ${message.content}`);
    return true;
  }
}