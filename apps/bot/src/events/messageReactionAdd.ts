import { MessageReaction, User } from 'discord.js';
import { KodariBot } from '../bot';
import { prisma } from '@kodari/database';

export default {
  name: 'messageReactionAdd',
  async execute(reaction: MessageReaction, user: User, bot: KodariBot) {
    if (user.bot) return;

    if (reaction.partial) {
      await reaction.fetch();
    }

    const reactionRole = await prisma.reactionRole.findUnique({
      where: {
        messageId_emoji: {
          messageId: reaction.message.id,
          emoji: reaction.emoji.toString(),
        },
      },
    });

    if (reactionRole) {
      const guild = reaction.message.guild;
      if (!guild) return;

      const member = await guild.members.fetch(user.id);
      await member.roles.add(reactionRole.roleId).catch(() => {});
    }
  },
};