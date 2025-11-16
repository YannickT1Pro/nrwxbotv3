import { GuildMember, EmbedBuilder } from 'discord.js';
import { KodariBot } from '../bot';

export default {
  name: 'guildMemberAdd',
  async execute(member: GuildMember, bot: KodariBot) {
    const raidDetected = await bot.securityManager.checkRaid(member);
    if (raidDetected) return;

    const verified = await bot.securityManager.checkVerification(member);

    const config = await bot.configManager.getConfig(member.guild.id);

    if (config.welcomeChannelId) {
      const channel = await member.guild.channels.fetch(config.welcomeChannelId);
      
      if (channel?.isTextBased()) {
        const message = config.welcomeMessage || 'Willkommen {user}!';
        const formatted = message
          .replace('{user}', `<@${member.id}>`)
          .replace('{guild}', member.guild.name)
          .replace('{memberCount}', member.guild.memberCount.toString());

        await channel.send(formatted);
      }
    }

    if (config.welcomeRoleId && verified) {
      await member.roles.add(config.welcomeRoleId).catch(() => {});
    }
  },
};