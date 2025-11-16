import { Message } from 'discord.js';
import { KodariBot } from '../bot';

export default {
  name: 'messageCreate',
  async execute(message: Message, bot: KodariBot) {
    if (message.author.bot) return;
    if (!message.guild) return;

    const spamDetected = await bot.securityManager.checkSpam(message);
    if (spamDetected) return;

    const linkBlocked = await bot.securityManager.checkLinkFilter(message);
    if (linkBlocked) return;
  },
};