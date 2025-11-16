import { Collection, SlashCommandBuilder } from 'discord.js';
import { KodariBot } from '../bot';
import { readdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: any, bot: KodariBot) => Promise<void>;
  permissions?: bigint[];
}

export class CommandManager {
  private bot: KodariBot;

  constructor(bot: KodariBot) {
    this.bot = bot;
  }

  async loadCommands(): Promise<void> {
    const commandsPath = join(__dirname, '../commands');
    const commandFolders = readdirSync(commandsPath);

    for (const folder of commandFolders) {
      const folderPath = join(commandsPath, folder);
      const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

      for (const file of commandFiles) {
        const filePath = join(folderPath, file);
        const command = require(filePath).default;

        if ('data' in command && 'execute' in command) {
          this.bot.commands.set(command.data.name, command);
          logger.info(`Loaded command: ${command.data.name}`);
        }
      }
    }
  }
}