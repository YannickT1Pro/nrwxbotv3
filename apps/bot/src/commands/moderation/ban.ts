import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { KodariBot } from '../../bot';
import { prisma, ModerationType } from '@kodari/database';

export default {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banne einen Benutzer')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Der Benutzer')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Grund')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('delete_days')
        .setDescription('Tage an Nachrichten löschen (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: CommandInteraction, bot: KodariBot) {
    const user = interaction.options.getUser('user')!;
    const reason = interaction.options.get('reason')?.value as string;
    const deleteDays = (interaction.options.get('delete_days')?.value as number) || 0;

    const caseNumber = await prisma.moderationCase.count({
      where: { guildId: interaction.guildId! }
    }) + 1;

    await interaction.guild!.members.ban(user, { 
      reason,
      deleteMessageSeconds: deleteDays * 24 * 60 * 60
    });

    await prisma.moderationCase.create({
      data: {
        guildId: interaction.guildId!,
        caseNumber,
        type: ModerationType.BAN,
        userId: user.id,
        moderatorId: interaction.user.id,
        reason,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle('🔨 Bann')
      .setColor(0xff0000)
      .addFields(
        { name: 'Benutzer', value: `${user.tag} (${user.id})`, inline: true },
        { name: 'Moderator', value: interaction.user.tag, inline: true },
        { name: 'Fall', value: `#${caseNumber}`, inline: true },
        { name: 'Grund', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    const config = await bot.configManager.getConfig(interaction.guildId!);
    if (config.modLogChannelId) {
      const logChannel = await interaction.guild!.channels.fetch(config.modLogChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send({ embeds: [embed] });
      }
    }
  },
};