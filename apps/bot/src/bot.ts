import { Client, GatewayIntentBits, Partials, Collection } from 'discord.js';
import { prisma } from '@kodari/database';
import { logger } from './utils/logger';
import { RedisService } from './services/RedisService';
import { CommandManager } from './managers/CommandManager';
import { EventManager } from './managers/EventManager';
import { MusicManager } from './managers/MusicManager';
import { TicketManager } from './managers/TicketManager';
import { SecurityManager } from './managers/SecurityManager';
import { AISupportManager } from './managers/AISupportManager';
import { ConfigManager } from './managers/ConfigManager';
import { QueueManager } from './managers/QueueManager';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  });
}

export class KodariBot extends Client {
  public commands: Collection<string, any>;
  public redis: RedisService;
  public configManager: ConfigManager;
  public musicManager: MusicManager;
  public ticketManager: TicketManager;
  public securityManager: SecurityManager;
  public aiSupportManager: AISupportManager;
  public queueManager: QueueManager;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User,
      ],
      presence: {
        status: 'online',
        activities: [{
          name: 'your server',
          type: 3,
        }],
      },
    });

    this.commands = new Collection();
    this.redis = new RedisService();
    this.configManager = new ConfigManager(this);
    this.musicManager = new MusicManager(this);
    this.ticketManager = new TicketManager(this);
    this.securityManager = new SecurityManager(this);
    this.aiSupportManager = new AISupportManager(this);
    this.queueManager = new QueueManager();
  }

  public async start() {
    try {
      await this.redis.connect();
      logger.info('Redis connected');

      await this.configManager.initialize();
      logger.info('Config manager initialized');

      await this.queueManager.initialize();
      logger.info('Queue manager initialized');

      const commandManager = new CommandManager(this);
      await commandManager.loadCommands();
      logger.info('Commands loaded');

      const eventManager = new EventManager(this);
      await eventManager.loadEvents();
      logger.info('Events loaded');

      await this.login(process.env.DISCORD_TOKEN);
      logger.info('Bot logged in');

    } catch (error) {
      logger.error('Failed to start bot:', error);
      Sentry.captureException(error);
      process.exit(1);
    }
  }

  public async stop() {
    logger.info('Shutting down bot...');
    await this.musicManager.cleanup();
    await this.queueManager.close();
    await this.redis.disconnect();
    await prisma.$disconnect();
    this.destroy();
  }
}

const bot = new KodariBot();
bot.start();

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
  Sentry.captureException(error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  Sentry.captureException(error);
  process.exit(1);
});